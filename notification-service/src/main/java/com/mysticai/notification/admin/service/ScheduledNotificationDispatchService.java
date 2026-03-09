package com.mysticai.notification.admin.service;

import com.mysticai.notification.entity.AdminNotification;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.repository.AdminNotificationRepository;
import com.mysticai.notification.repository.NotificationRepository;
import com.mysticai.notification.repository.PushTokenRepository;
import com.mysticai.notification.service.PushService;
import com.mysticai.notification.service.WebSocketNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Handles the actual dispatch of scheduled AdminNotifications when their scheduledAt time arrives.
 *
 * Design decisions:
 * - processDueNotifications() is NOT @Transactional — it scans the DB and delegates per-record.
 * - claimAndDispatch() is @Transactional(REQUIRES_NEW) — each notification gets its own transaction
 *   with a pessimistic write lock to prevent duplicate dispatch.
 * - Push is sent to all distinct active push-token holders (no real audience segmentation yet).
 * - Bulk sends do NOT create per-user Notification records (too costly); only the AdminNotification
 *   record tracks the result. In-app records are a Sprint 3B enhancement.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledNotificationDispatchService {

    private final AdminNotificationRepository adminNotifRepository;
    private final PushTokenRepository pushTokenRepository;
    private final PushService pushService;
    private final NotificationRepository notificationRepository;
    private final WebSocketNotificationService wsService;
    private final AuditLogService auditLogService;

    /**
     * Self-reference to allow @Transactional(REQUIRES_NEW) to be honored through the Spring proxy.
     * @Lazy prevents circular initialization.
     */
    @Autowired
    @Lazy
    private ScheduledNotificationDispatchService self;

    /**
     * Called by ScheduledNotificationJob every minute.
     * Finds all due SCHEDULED notifications and dispatches each in its own transaction.
     */
    public void processDueNotifications() {
        LocalDateTime now = LocalDateTime.now();
        List<AdminNotification> due = adminNotifRepository.findDueForDispatch(now);

        if (due.isEmpty()) return;
        log.info("[SCHEDULED-DISPATCH] {} notification(s) due for dispatch", due.size());

        for (AdminNotification notif : due) {
            try {
                self.claimAndDispatch(notif.getId());
            } catch (Exception e) {
                log.error("[SCHEDULED-DISPATCH] id={} dispatch threw unexpectedly: {}", notif.getId(), e.getMessage());
            }
        }
    }

    /**
     * Atomically claims a SCHEDULED notification and dispatches it.
     * Uses pessimistic write lock + REQUIRES_NEW so each notification has its own commit/rollback.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void claimAndDispatch(Long notifId) {
        // Re-fetch with pessimistic lock
        AdminNotification notif = adminNotifRepository.findByIdForUpdate(notifId).orElse(null);
        if (notif == null) return;

        // Guard: only process records that are still SCHEDULED (prevents double dispatch)
        if (notif.getStatus() != AdminNotification.Status.SCHEDULED) {
            log.debug("[SCHEDULED-DISPATCH] id={} is no longer SCHEDULED (status={}), skipping", notifId, notif.getStatus());
            return;
        }
        if (!notif.isActive()) {
            log.debug("[SCHEDULED-DISPATCH] id={} is inactive, marking CANCELLED", notifId);
            notif.setStatus(AdminNotification.Status.CANCELLED);
            adminNotifRepository.save(notif);
            return;
        }

        log.info("[SCHEDULED-DISPATCH] Dispatching id={} title='{}' audience={}", notifId, notif.getTitle(), notif.getTargetAudience());

        int sent = 0;
        int failed = 0;
        String failureReason = null;

        try {
            List<Long> targetUserIds = resolveTargetUserIds(notif);
            if (targetUserIds.isEmpty()) {
                log.warn("[SCHEDULED-DISPATCH] id={} no active push token holders found, nothing to send", notifId);
            }

            String deeplink = null;

            // Build a synthetic Notification (not persisted) just for push content
            Notification pushPayload = Notification.builder()
                    .title(notif.getTitle())
                    .body(notif.getBody())
                    .deeplink(deeplink)
                    .priority(notif.getPriority())
                    .category(notif.getCategory())
                    .deliveryChannel(notif.getDeliveryChannel())
                    .build();

            for (Long userId : targetUserIds) {
                try {
                    boolean ok = shouldSendPush(notif) && pushService.sendPush(userId, pushPayload);
                    if (ok) {
                        sent++;
                        if (shouldSendInApp(notif)) {
                            sendInApp(userId, notif, deeplink);
                        }
                    } else {
                        failed++;
                    }
                } catch (Exception e) {
                    log.warn("[SCHEDULED-DISPATCH] id={} user={} send failed: {}", notifId, userId, e.getMessage());
                    failed++;
                }
            }

            notif.setStatus(AdminNotification.Status.SENT);
            notif.setSentAt(LocalDateTime.now());

        } catch (Exception e) {
            log.error("[SCHEDULED-DISPATCH] id={} fatal dispatch error: {}", notifId, e.getMessage(), e);
            notif.setStatus(AdminNotification.Status.FAILED);
            failureReason = e.getClass().getSimpleName() + ": " + e.getMessage();
            notif.setFailureReason(failureReason);
        }

        notif.setSentCount(sent);
        notif.setFailedCount(failed);
        adminNotifRepository.save(notif);

        AuditLog.ActionType auditType = failureReason == null
                ? AuditLog.ActionType.NOTIFICATION_SENT
                : AuditLog.ActionType.NOTIFICATION_DISPATCH_FAILED;

        auditLogService.log(
                notif.getCreatedByAdminId(), "scheduler", null,
                auditType, AuditLog.EntityType.NOTIFICATION,
                notifId.toString(), notif.getTitle(), null,
                Map.of("sent", sent, "failed", failed,
                       "audience", notif.getTargetAudience().name(),
                       "failureReason", failureReason != null ? failureReason : "none")
        );

        log.info("[SCHEDULED-DISPATCH] id={} done — status={} sent={} failed={}", notifId, notif.getStatus(), sent, failed);
    }

    private List<Long> resolveTargetUserIds(AdminNotification notif) {
        // For now all audience types map to all active push token holders.
        // PREMIUM_USERS / TEST_USERS segmentation requires user-service integration (Sprint 3B+).
        return pushTokenRepository.findDistinctActiveUserIds();
    }

    private boolean shouldSendPush(AdminNotification notif) {
        return notif.getDeliveryChannel() == Notification.DeliveryChannel.PUSH
                || notif.getDeliveryChannel() == Notification.DeliveryChannel.BOTH;
    }

    private boolean shouldSendInApp(AdminNotification notif) {
        return notif.getDeliveryChannel() == Notification.DeliveryChannel.IN_APP
                || notif.getDeliveryChannel() == Notification.DeliveryChannel.BOTH;
    }

    private void sendInApp(Long userId, AdminNotification notif, String deeplink) {
        Notification inApp = Notification.builder()
                .userId(userId)
                .type(Notification.NotificationType.PRODUCT_UPDATE)
                .category(notif.getCategory())
                .priority(notif.getPriority())
                .title(notif.getTitle())
                .body(notif.getBody())
                .deeplink(deeplink)
                .deliveryChannel(Notification.DeliveryChannel.IN_APP)
                .sourceModule("admin-broadcast")
                .dedupKey("admin:" + notif.getId() + ":" + userId)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();
        Notification saved = notificationRepository.save(inApp);
        try {
            wsService.sendNotificationToUser(userId, saved);
        } catch (Exception ignored) {}
    }
}
