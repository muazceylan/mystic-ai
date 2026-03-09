package com.mysticai.notification.admin.service;

import com.mysticai.notification.entity.AdminNotification;
import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.repository.AdminNotificationRepository;
import com.mysticai.notification.repository.NotificationRepository;
import com.mysticai.notification.repository.PushTokenRepository;
import com.mysticai.notification.service.PushService;
import com.mysticai.notification.service.WebSocketNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScheduledNotificationDispatchServiceTest {

    @Mock AdminNotificationRepository adminNotifRepository;
    @Mock PushTokenRepository pushTokenRepository;
    @Mock PushService pushService;
    @Mock NotificationRepository notificationRepository;
    @Mock WebSocketNotificationService wsService;
    @Mock AuditLogService auditLogService;

    @InjectMocks ScheduledNotificationDispatchService service;

    @BeforeEach
    void setUp() {
        // Inject self reference so that claimAndDispatch() is callable from processDueNotifications()
        // (in production, Spring injects the proxy; in tests we inject the real instance directly)
        ReflectionTestUtils.setField(service, "self", service);
    }

    private AdminNotification scheduledNotif(Long id) {
        return AdminNotification.builder()
                .id(id)
                .title("Test Notif")
                .body("Body")
                .status(AdminNotification.Status.SCHEDULED)
                .scheduledAt(LocalDateTime.now().minusMinutes(1))
                .targetAudience(AdminNotification.TargetAudience.ALL_USERS)
                .deliveryChannel(Notification.DeliveryChannel.PUSH)
                .category(Notification.NotificationCategory.SYSTEM)
                .priority(Notification.Priority.NORMAL)
                .isActive(true)
                .build();
    }

    // ── claimAndDispatch: status guard ───────────────────────────────────────

    @Test
    void claimAndDispatch_skipsIfNoLongerScheduled() {
        AdminNotification alreadySent = scheduledNotif(1L);
        alreadySent.setStatus(AdminNotification.Status.SENT);

        when(adminNotifRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(alreadySent));

        service.claimAndDispatch(1L);

        verify(pushTokenRepository, never()).findDistinctActiveUserIds();
        verify(adminNotifRepository, never()).save(any());
    }

    @Test
    void claimAndDispatch_skipsIfNotFound() {
        when(adminNotifRepository.findByIdForUpdate(99L)).thenReturn(Optional.empty());

        assertThatNoException().isThrownBy(() -> service.claimAndDispatch(99L));
        verify(adminNotifRepository, never()).save(any());
    }

    @Test
    void claimAndDispatch_cancelsInactiveNotification() {
        AdminNotification notif = scheduledNotif(2L);
        notif.setActive(false);

        when(adminNotifRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(notif));
        when(adminNotifRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.claimAndDispatch(2L);

        assertThat(notif.getStatus()).isEqualTo(AdminNotification.Status.CANCELLED);
        verify(pushTokenRepository, never()).findDistinctActiveUserIds();
    }

    // ── claimAndDispatch: successful dispatch ────────────────────────────────

    @Test
    void claimAndDispatch_marksAsSentWithCorrectCounts() {
        AdminNotification notif = scheduledNotif(3L);
        when(adminNotifRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(notif));
        when(pushTokenRepository.findDistinctActiveUserIds()).thenReturn(List.of(10L, 11L, 12L));
        when(pushService.sendPush(anyLong(), any())).thenReturn(true);
        when(adminNotifRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.claimAndDispatch(3L);

        assertThat(notif.getStatus()).isEqualTo(AdminNotification.Status.SENT);
        assertThat(notif.getSentAt()).isNotNull();
        assertThat(notif.getSentCount()).isEqualTo(3);
        assertThat(notif.getFailedCount()).isEqualTo(0);
        verify(auditLogService).log(any(), any(), any(),
                eq(com.mysticai.notification.entity.AuditLog.ActionType.NOTIFICATION_SENT),
                any(), any(), any(), any(), any());
    }

    @Test
    void claimAndDispatch_tracksPushFailuresInCount() {
        AdminNotification notif = scheduledNotif(4L);
        when(adminNotifRepository.findByIdForUpdate(4L)).thenReturn(Optional.of(notif));
        when(pushTokenRepository.findDistinctActiveUserIds()).thenReturn(List.of(10L, 11L));
        when(pushService.sendPush(eq(10L), any())).thenReturn(true);
        when(pushService.sendPush(eq(11L), any())).thenReturn(false);
        when(adminNotifRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.claimAndDispatch(4L);

        assertThat(notif.getStatus()).isEqualTo(AdminNotification.Status.SENT);
        assertThat(notif.getSentCount()).isEqualTo(1);
        assertThat(notif.getFailedCount()).isEqualTo(1);
    }

    // ── claimAndDispatch: fatal error path ───────────────────────────────────

    @Test
    void claimAndDispatch_marksAsFailedOnFatalError() {
        AdminNotification notif = scheduledNotif(5L);
        when(adminNotifRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(notif));
        when(pushTokenRepository.findDistinctActiveUserIds())
                .thenThrow(new RuntimeException("DB connection lost"));
        when(adminNotifRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.claimAndDispatch(5L);

        assertThat(notif.getStatus()).isEqualTo(AdminNotification.Status.FAILED);
        assertThat(notif.getFailureReason()).contains("DB connection lost");
        verify(auditLogService).log(any(), any(), any(),
                eq(com.mysticai.notification.entity.AuditLog.ActionType.NOTIFICATION_DISPATCH_FAILED),
                any(), any(), any(), any(), any());
    }

    // ── processDueNotifications: batch ──────────────────────────────────────

    @Test
    void processDueNotifications_doesNothingWhenNoDueNotifications() {
        when(adminNotifRepository.findDueForDispatch(any())).thenReturn(List.of());

        service.processDueNotifications();

        verify(adminNotifRepository, never()).findByIdForUpdate(any());
    }

    @Test
    void processDueNotifications_processesEachDueNotification() {
        AdminNotification n1 = scheduledNotif(1L);
        AdminNotification n2 = scheduledNotif(2L);
        when(adminNotifRepository.findDueForDispatch(any())).thenReturn(List.of(n1, n2));
        when(adminNotifRepository.findByIdForUpdate(any())).thenReturn(Optional.empty()); // already claimed

        service.processDueNotifications();

        verify(adminNotifRepository).findByIdForUpdate(1L);
        verify(adminNotifRepository).findByIdForUpdate(2L);
    }
}
