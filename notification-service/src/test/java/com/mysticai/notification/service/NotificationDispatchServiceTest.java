package com.mysticai.notification.service;

import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.entity.NotificationPreference;
import com.mysticai.notification.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationDispatchServiceTest {

    @Mock NotificationRepository notificationRepository;

    @InjectMocks NotificationDispatchService service;

    @Test
    void shouldLimitLowFrequencyUsersAfterThirdPush() {
        Long userId = 42L;
        NotificationPreference preference = basePreferenceBuilder(userId)
                .frequencyLevel(NotificationPreference.FrequencyLevel.LOW)
                .build();

        when(notificationRepository.findByDedupKey(eq("42:DAILY_SUMMARY:" + java.time.LocalDate.now())))
                .thenReturn(Optional.empty());
        when(notificationRepository.countPushSentSince(eq(userId), any()))
                .thenReturn(3L);

        NotificationDispatchService.DispatchDecision decision =
                service.evaluate(userId, Notification.NotificationType.DAILY_SUMMARY, preference);

        assertThat(decision).isEqualTo(NotificationDispatchService.DispatchDecision.IN_APP_ONLY);
    }

    @Test
    void shouldAllowBalancedFrequencyUsersBeforeSixthPush() {
        Long userId = 43L;
        NotificationPreference preference = basePreferenceBuilder(userId)
                .frequencyLevel(NotificationPreference.FrequencyLevel.BALANCED)
                .build();

        when(notificationRepository.findByDedupKey(eq("43:DAILY_SUMMARY:" + java.time.LocalDate.now())))
                .thenReturn(Optional.empty());
        when(notificationRepository.countPushSentSince(eq(userId), any()))
                .thenReturn(5L);

        NotificationDispatchService.DispatchDecision decision =
                service.evaluate(userId, Notification.NotificationType.DAILY_SUMMARY, preference);

        assertThat(decision).isEqualTo(NotificationDispatchService.DispatchDecision.PUSH_AND_IN_APP);
    }

    @Test
    void shouldLimitFrequentUsersAfterNinthPush() {
        Long userId = 44L;
        NotificationPreference preference = basePreferenceBuilder(userId)
                .frequencyLevel(NotificationPreference.FrequencyLevel.FREQUENT)
                .build();

        when(notificationRepository.findByDedupKey(eq("44:DAILY_SUMMARY:" + java.time.LocalDate.now())))
                .thenReturn(Optional.empty());
        when(notificationRepository.countPushSentSince(eq(userId), any()))
                .thenReturn(9L);

        NotificationDispatchService.DispatchDecision decision =
                service.evaluate(userId, Notification.NotificationType.DAILY_SUMMARY, preference);

        assertThat(decision).isEqualTo(NotificationDispatchService.DispatchDecision.IN_APP_ONLY);
    }

    private NotificationPreference.NotificationPreferenceBuilder basePreferenceBuilder(Long userId) {
        return NotificationPreference.builder()
                .userId(userId)
                .dailyEnabled(true)
                .pushEnabled(true)
                .preferredTimeSlot(NotificationPreference.TimeSlot.MORNING)
                .quietHoursStart(LocalTime.MIDNIGHT)
                .quietHoursEnd(LocalTime.MIDNIGHT)
                .timezone("Europe/Istanbul");
    }
}
