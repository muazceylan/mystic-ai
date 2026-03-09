package com.mysticai.notification.admin.service;

import com.mysticai.notification.entity.Notification.NotificationType;
import com.mysticai.notification.entity.NotificationTrigger;
import com.mysticai.notification.repository.NotificationRepository;
import com.mysticai.notification.repository.PushTokenRepository;
import com.mysticai.notification.scheduler.NotificationScheduler;
import com.mysticai.notification.service.NotificationGenerationService;
import com.mysticai.notification.service.UserEngagementScorerService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Verifies that scheduler methods respect the trigger-active guard:
 *  - when a trigger is disabled, no notifications are generated
 *  - a SKIPPED run status is recorded in the trigger monitor
 *  - no exception propagates to the caller
 */
@ExtendWith(MockitoExtension.class)
class NotificationSchedulerTest {

    @Mock NotificationGenerationService generationService;
    @Mock UserEngagementScorerService engagementScorer;
    @Mock PushTokenRepository pushTokenRepository;
    @Mock NotificationRepository notificationRepository;
    @Mock NotificationTriggerService triggerService;

    @InjectMocks NotificationScheduler scheduler;

    @Test
    void shouldSkipGenerationWhenTriggerIsDisabled() {
        // ── Arrange ──────────────────────────────────────────────────────────
        // Simulate admin disabling the dream-reminder trigger
        when(triggerService.isActive("dream_reminder_job")).thenReturn(false);

        // ── Act ───────────────────────────────────────────────────────────────
        assertThatNoException().isThrownBy(() -> scheduler.generateDreamReminders());

        // ── Assert: no notifications generated ───────────────────────────────
        verify(generationService, never())
                .generateNotification(any(), any(), any());

        verify(pushTokenRepository, never()).findAllByActiveTrue();

        // ── Assert: SKIPPED status recorded in trigger monitor ────────────────
        verify(triggerService).recordRun(
                eq("dream_reminder_job"),
                eq(NotificationTrigger.RunStatus.SKIPPED),
                eq(0),
                any()
        );

        // SUCCESS must NOT have been recorded (trigger didn't run)
        verify(triggerService, never()).recordRun(
                eq("dream_reminder_job"),
                eq(NotificationTrigger.RunStatus.SUCCESS),
                anyInt(),
                any()
        );
    }

    @Test
    void shouldGenerateNotificationsWhenTriggerIsActive() {
        // ── Arrange ──────────────────────────────────────────────────────────
        when(triggerService.isActive("dream_reminder_job")).thenReturn(true);
        when(pushTokenRepository.findAllByActiveTrue()).thenReturn(
                java.util.List.of(
                        stubToken(10L), stubToken(11L)
                )
        );

        // ── Act ───────────────────────────────────────────────────────────────
        scheduler.generateDreamReminders();

        // ── Assert: generation attempted for each active user ─────────────────
        verify(generationService, times(2))
                .generateNotification(any(), eq(NotificationType.DREAM_REMINDER), eq(null));

        // SUCCESS recorded
        verify(triggerService).recordRun(
                eq("dream_reminder_job"),
                eq(NotificationTrigger.RunStatus.SUCCESS),
                eq(2),
                any()
        );
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private com.mysticai.notification.entity.PushToken stubToken(Long userId) {
        return com.mysticai.notification.entity.PushToken.builder()
                .userId(userId)
                .token("token-" + userId)
                .active(true)
                .build();
    }
}
