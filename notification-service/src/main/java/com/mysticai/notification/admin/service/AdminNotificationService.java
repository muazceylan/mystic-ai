package com.mysticai.notification.admin.service;

import com.mysticai.notification.admin.spec.AdminNotificationSpec;
import com.mysticai.notification.entity.*;
import com.mysticai.notification.repository.AdminNotificationRepository;
import com.mysticai.notification.repository.AppRouteRegistryRepository;
import com.mysticai.notification.repository.PushTokenRepository;
import com.mysticai.notification.service.NotificationGenerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminNotificationService {

    private final AdminNotificationRepository adminNotifRepository;
    private final AppRouteRegistryRepository routeRepository;
    private final PushTokenRepository pushTokenRepository;
    private final NotificationGenerationService notificationGenerationService;
    private final AuditLogService auditLogService;

    public Page<AdminNotification> findAll(AdminNotification.Status status,
                                           Notification.NotificationCategory category,
                                           Notification.DeliveryChannel channel,
                                           AdminNotification.TargetAudience audience,
                                           LocalDateTime from, LocalDateTime to,
                                           Pageable pageable) {
        return adminNotifRepository.findAll(
                AdminNotificationSpec.filter(status, category, channel, audience, from, to),
                pageable);
    }

    public AdminNotification findById(Long id) {
        return adminNotifRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found: " + id));
    }

    @Transactional
    public AdminNotification create(AdminNotification notification, Long adminId, String adminEmail,
                                    AdminUser.Role role) {
        validateRouteKey(notification.getRouteKey());
        notification.setCreatedByAdminId(adminId);
        notification.setUpdatedByAdminId(adminId);
        if (notification.getStatus() == null) notification.setStatus(AdminNotification.Status.DRAFT);

        AdminNotification saved = adminNotifRepository.save(notification);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.NOTIFICATION_CREATE, AuditLog.EntityType.NOTIFICATION,
                saved.getId().toString(), saved.getTitle(), null, saved);
        return saved;
    }

    @Transactional
    public AdminNotification update(Long id, AdminNotification updates, Long adminId, String adminEmail,
                                    AdminUser.Role role) {
        AdminNotification existing = findById(id);
        validateRouteKey(updates.getRouteKey());
        AdminNotification snapshot = cloneSnapshot(existing);

        existing.setTitle(updates.getTitle());
        existing.setBody(updates.getBody());
        existing.setCategory(updates.getCategory());
        existing.setPriority(updates.getPriority());
        existing.setDeliveryChannel(updates.getDeliveryChannel());
        existing.setTargetAudience(updates.getTargetAudience());
        existing.setRouteKey(updates.getRouteKey());
        existing.setFallbackRouteKey(updates.getFallbackRouteKey());
        existing.setScheduledAt(updates.getScheduledAt());
        existing.setActive(updates.isActive());
        existing.setNotes(updates.getNotes());
        existing.setUpdatedByAdminId(adminId);

        AdminNotification saved = adminNotifRepository.save(existing);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.NOTIFICATION_UPDATE, AuditLog.EntityType.NOTIFICATION,
                saved.getId().toString(), saved.getTitle(), snapshot, saved);
        return saved;
    }

    @Transactional
    public AdminNotification testSend(Long id, Long targetUserId, Long adminId, String adminEmail,
                                      AdminUser.Role role) {
        AdminNotification adminNotif = findById(id);

        // Resolve deeplink from routeKey
        String deeplink = null;
        if (adminNotif.getRouteKey() != null) {
            deeplink = routeRepository.findByRouteKey(adminNotif.getRouteKey())
                    .map(AppRouteRegistry::getPath)
                    .orElse(null);
        }

        Notification sent = notificationGenerationService.sendTestNotification(
                targetUserId,
                adminNotif.getTitle(),
                adminNotif.getBody(),
                deeplink
        );

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.NOTIFICATION_TEST_SEND, AuditLog.EntityType.NOTIFICATION,
                id.toString(), adminNotif.getTitle(),
                null,
                java.util.Map.of("targetUserId", targetUserId, "pushSent", Boolean.TRUE.equals(sent.getPushSent()))
        );

        return adminNotif;
    }

    /**
     * Transition a DRAFT notification to SCHEDULED status with a future scheduledAt time.
     * - Past times are rejected.
     * - Already SENT/CANCELLED/FAILED notifications cannot be re-scheduled.
     * - Route validation is re-applied at schedule time.
     */
    @Transactional
    public AdminNotification schedule(Long id, LocalDateTime scheduledAt, Long adminId,
                                       String adminEmail, AdminUser.Role role) {
        if (scheduledAt == null) throw new IllegalArgumentException("scheduledAt is required");
        if (scheduledAt.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("scheduledAt must be in the future");
        }

        AdminNotification notif = findById(id);
        if (notif.getStatus() == AdminNotification.Status.SENT
                || notif.getStatus() == AdminNotification.Status.CANCELLED
                || notif.getStatus() == AdminNotification.Status.FAILED) {
            throw new IllegalArgumentException("Cannot schedule a notification in status: " + notif.getStatus());
        }

        validateRouteKey(notif.getRouteKey()); // re-validate at schedule time

        AdminNotification snapshot = cloneSnapshot(notif);
        notif.setScheduledAt(scheduledAt);
        notif.setStatus(AdminNotification.Status.SCHEDULED);
        notif.setUpdatedByAdminId(adminId);
        AdminNotification saved = adminNotifRepository.save(notif);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.NOTIFICATION_SCHEDULED, AuditLog.EntityType.NOTIFICATION,
                id.toString(), notif.getTitle(), snapshot,
                java.util.Map.of("scheduledAt", scheduledAt.toString()));
        return saved;
    }

    @Transactional
    public void cancel(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        AdminNotification notif = findById(id);
        AdminNotification snapshot = cloneSnapshot(notif);
        notif.setStatus(AdminNotification.Status.CANCELLED);
        notif.setUpdatedByAdminId(adminId);
        adminNotifRepository.save(notif);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.NOTIFICATION_CANCEL, AuditLog.EntityType.NOTIFICATION,
                id.toString(), notif.getTitle(), snapshot, notif);
    }

    @Transactional
    public void deactivate(Long id, Long adminId, String adminEmail, AdminUser.Role role) {
        AdminNotification notif = findById(id);
        AdminNotification snapshot = cloneSnapshot(notif);
        notif.setActive(false);
        notif.setUpdatedByAdminId(adminId);
        adminNotifRepository.save(notif);
        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.NOTIFICATION_DEACTIVATE, AuditLog.EntityType.NOTIFICATION,
                id.toString(), notif.getTitle(), snapshot, notif);
    }

    public List<AdminNotification> findRecent5() {
        return adminNotifRepository.findTop5ByOrderByCreatedAtDesc();
    }

    private void validateRouteKey(String routeKey) {
        if (routeKey == null) return;
        AppRouteRegistry route = routeRepository.findByRouteKey(routeKey)
                .orElseThrow(() -> new IllegalArgumentException("Unknown routeKey: " + routeKey));
        if (!route.isActive()) {
            throw new IllegalArgumentException("Route is inactive: " + routeKey);
        }
        if (route.isDeprecated()) {
            throw new IllegalArgumentException("Route is deprecated: " + routeKey + ". Use an active replacement.");
        }
    }

    private AdminNotification cloneSnapshot(AdminNotification n) {
        return AdminNotification.builder()
                .id(n.getId()).title(n.getTitle()).body(n.getBody())
                .category(n.getCategory()).priority(n.getPriority())
                .deliveryChannel(n.getDeliveryChannel()).targetAudience(n.getTargetAudience())
                .routeKey(n.getRouteKey()).fallbackRouteKey(n.getFallbackRouteKey())
                .status(n.getStatus()).scheduledAt(n.getScheduledAt())
                .isActive(n.isActive()).notes(n.getNotes()).build();
    }
}
