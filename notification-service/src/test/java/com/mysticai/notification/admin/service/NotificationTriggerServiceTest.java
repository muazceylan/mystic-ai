package com.mysticai.notification.admin.service;

import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.NotificationTrigger;
import com.mysticai.notification.repository.NotificationTriggerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Verifies the system-critical trigger guard:
 *  - disable() on a system-critical trigger throws IllegalStateException
 *  - disable() on a non-pausable trigger throws IllegalStateException
 *  - the trigger is NOT saved on rejection (stays active)
 *  - no success audit log is written on rejection
 */
@ExtendWith(MockitoExtension.class)
class NotificationTriggerServiceTest {

    @Mock NotificationTriggerRepository repository;
    @Mock AuditLogService auditLogService;

    @InjectMocks NotificationTriggerService service;

    private static final Long ADMIN_ID = 1L;
    private static final String ADMIN_EMAIL = "admin@mystic.ai";
    private static final AdminUser.Role ROLE = AdminUser.Role.SUPER_ADMIN;

    @Test
    void shouldReturn403WhenDisablingSystemCriticalTrigger() {
        // ── Arrange ──────────────────────────────────────────────────────────
        NotificationTrigger criticalTrigger = NotificationTrigger.builder()
                .id(1L)
                .triggerKey("horoscope_ingest_daily")
                .displayName("Günlük Burç İngesti")
                .isActive(true)
                .isSystemCritical(true)
                .isPausable(false)
                .cadenceType(NotificationTrigger.CadenceType.DAILY)
                .sourceType(NotificationTrigger.SourceType.STATIC_BACKEND)
                .build();

        when(repository.findById(1L)).thenReturn(Optional.of(criticalTrigger));

        // ── Act & Assert: exception thrown ────────────────────────────────────
        assertThatThrownBy(() ->
                service.disable(1L, ADMIN_ID, ADMIN_EMAIL, ROLE))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("system-critical");

        // ── Assert: trigger NOT persisted ─────────────────────────────────────
        verify(repository, never()).save(any());
        assertThat(criticalTrigger.isActive())
                .as("system-critical trigger must remain active after rejected disable attempt")
                .isTrue();

        // ── Assert: no success audit log ──────────────────────────────────────
        verify(auditLogService, never()).log(
                any(), any(), any(),
                eq(AuditLog.ActionType.NOTIFICATION_TRIGGER_DISABLED),
                any(), any(), any(), any(), any()
        );
    }

    @Test
    void shouldRejectDisablingNonPausableTrigger() {
        // ── Arrange ──────────────────────────────────────────────────────────
        NotificationTrigger nonPausable = NotificationTrigger.builder()
                .id(2L)
                .triggerKey("admin_scheduled_dispatch")
                .displayName("Admin Zamanlanmış Gönderim")
                .isActive(true)
                .isSystemCritical(false)
                .isPausable(false)       // not pausable, but not system-critical
                .cadenceType(NotificationTrigger.CadenceType.HOURLY)
                .sourceType(NotificationTrigger.SourceType.ADMIN_SCHEDULED)
                .build();

        when(repository.findById(2L)).thenReturn(Optional.of(nonPausable));

        // ── Act & Assert ──────────────────────────────────────────────────────
        assertThatThrownBy(() ->
                service.disable(2L, ADMIN_ID, ADMIN_EMAIL, ROLE))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not pausable");

        verify(repository, never()).save(any());
        assertThat(nonPausable.isActive()).isTrue();
    }

    @Test
    void shouldAllowDisablingPausableNonCriticalTrigger() {
        // ── Arrange ──────────────────────────────────────────────────────────
        NotificationTrigger pausable = NotificationTrigger.builder()
                .id(3L)
                .triggerKey("dream_reminder_job")
                .displayName("Rüya Hatırlatıcı İşi")
                .isActive(true)
                .isSystemCritical(false)
                .isPausable(true)
                .cadenceType(NotificationTrigger.CadenceType.DAILY)
                .sourceType(NotificationTrigger.SourceType.STATIC_BACKEND)
                .build();

        when(repository.findById(3L)).thenReturn(Optional.of(pausable));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // ── Act ───────────────────────────────────────────────────────────────
        NotificationTrigger result = service.disable(3L, ADMIN_ID, ADMIN_EMAIL, ROLE);

        // ── Assert: trigger deactivated and saved ────────────────────────────
        assertThat(result.isActive()).isFalse();
        verify(repository).save(pausable);

        // Audit log for DISABLED action written
        verify(auditLogService).log(
                eq(ADMIN_ID), eq(ADMIN_EMAIL), eq(ROLE),
                eq(AuditLog.ActionType.NOTIFICATION_TRIGGER_DISABLED),
                any(), any(), any(), any(), any()
        );
    }
}
