package com.mysticai.notification.admin.service;

import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.entity.Notification.NotificationType;
import com.mysticai.notification.entity.NotificationTrigger;
import com.mysticai.notification.repository.NotificationPreferenceRepository;
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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationSchedulerTest {

    @Mock NotificationGenerationService generationService;
    @Mock UserEngagementScorerService engagementScorer;
    @Mock PushTokenRepository pushTokenRepository;
    @Mock NotificationPreferenceRepository preferenceRepository;
    @Mock NotificationRepository notificationRepository;
    @Mock NotificationTriggerService triggerService;

    @InjectMocks NotificationScheduler scheduler;

    @Test
    void shouldSkipGenerationWhenTriggerIsDisabled() {
        when(triggerService.isActive("dream_reminder_job")).thenReturn(false);

        assertThatNoException().isThrownBy(() -> scheduler.generateDreamReminders());

        verify(generationService, never()).generateNotification(any(), any(), any());
        verify(pushTokenRepository, never()).findDistinctActiveUserIds();
        verify(preferenceRepository, never()).findDistinctUserIds();
        verify(notificationRepository, never()).findDistinctUserIds();
        verify(triggerService).recordRun(
                eq("dream_reminder_job"),
                eq(NotificationTrigger.RunStatus.SKIPPED),
                eq(0),
                any()
        );
        verify(triggerService, never()).recordRun(
                eq("dream_reminder_job"),
                eq(NotificationTrigger.RunStatus.SUCCESS),
                anyInt(),
                any()
        );
    }

    @Test
    void shouldSkipScheduledDreamReminderGenerationWhenTriggerIsActive() {
        when(triggerService.isActive("dream_reminder_job")).thenReturn(true);

        scheduler.generateDreamReminders();

        verify(generationService, never()).generateNotification(any(), eq(NotificationType.DREAM_REMINDER), eq(null));
        verify(triggerService).recordRun(
                eq("dream_reminder_job"),
                eq(NotificationTrigger.RunStatus.SKIPPED),
                eq(0),
                any()
        );
    }

    @Test
    void shouldCountOnlyCreatedNotificationsInDailyMetrics() {
        when(triggerService.isActive("daily_notification_generation")).thenReturn(true);
        when(pushTokenRepository.findDistinctActiveUserIds()).thenReturn(List.of(10L, 11L));
        when(preferenceRepository.findDistinctUserIds()).thenReturn(List.of());
        when(notificationRepository.findDistinctUserIds()).thenReturn(List.of());
        when(generationService.generateNotification(10L, NotificationType.DAILY_SUMMARY, null))
                .thenReturn(Optional.of(stubNotification()));
        when(generationService.generateNotification(11L, NotificationType.DAILY_SUMMARY, null))
                .thenReturn(Optional.empty());

        scheduler.generateDailyNotifications();

        verify(triggerService).recordRun(
                eq("daily_notification_generation"),
                eq(NotificationTrigger.RunStatus.SUCCESS),
                eq(1),
                any()
        );
    }

    private Notification stubNotification() {
        return Notification.builder()
                .title("Dream ready")
                .body("Open your journal")
                .build();
    }
}
