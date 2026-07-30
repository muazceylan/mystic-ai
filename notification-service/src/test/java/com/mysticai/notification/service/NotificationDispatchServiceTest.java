package com.mysticai.notification.service;

import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.entity.NotificationPreference;
import com.mysticai.notification.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationDispatchServiceTest {

    /** 2026-07-30T21:00:00Z == 2026-07-31T00:00:00+03:00 (Europe/Istanbul). */
    private static final Clock FIXED_CLOCK =
            Clock.fixed(Instant.parse("2026-07-30T21:00:00Z"), ZoneId.of("Europe/Istanbul"));

    @Mock NotificationRepository notificationRepository;

    @InjectMocks NotificationDispatchService service;

    @BeforeEach
    void setUp() {
        service.setClock(FIXED_CLOCK);
    }

    @Test
    void shouldLimitLowFrequencyUsersAfterThirdPush() {
        Long userId = 42L;
        NotificationPreference preference = basePreferenceBuilder(userId)
                .frequencyLevel(NotificationPreference.FrequencyLevel.LOW)
                .build();
        String expectedDedupKey = expectedDedupKey(userId, preference);

        when(notificationRepository.findByDedupKey(eq(expectedDedupKey)))
                .thenReturn(Optional.empty());
        when(notificationRepository.countPushSentSince(eq(userId), any()))
                .thenReturn(3L);

        NotificationDispatchService.DispatchDecision decision =
                service.evaluate(userId, Notification.NotificationType.DAILY_SUMMARY, preference);

        assertThat(decision).isEqualTo(NotificationDispatchService.DispatchDecision.IN_APP_ONLY);
        verify(notificationRepository).findByDedupKey(expectedDedupKey);
    }

    @Test
    void shouldAllowBalancedFrequencyUsersBeforeSixthPush() {
        Long userId = 43L;
        NotificationPreference preference = basePreferenceBuilder(userId)
                .frequencyLevel(NotificationPreference.FrequencyLevel.BALANCED)
                .build();
        String expectedDedupKey = expectedDedupKey(userId, preference);

        when(notificationRepository.findByDedupKey(eq(expectedDedupKey)))
                .thenReturn(Optional.empty());
        when(notificationRepository.countPushSentSince(eq(userId), any()))
                .thenReturn(5L);

        NotificationDispatchService.DispatchDecision decision =
                service.evaluate(userId, Notification.NotificationType.DAILY_SUMMARY, preference);

        assertThat(decision).isEqualTo(NotificationDispatchService.DispatchDecision.PUSH_AND_IN_APP);
        verify(notificationRepository).findByDedupKey(expectedDedupKey);
    }

    @Test
    void shouldLimitFrequentUsersAfterNinthPush() {
        Long userId = 44L;
        NotificationPreference preference = basePreferenceBuilder(userId)
                .frequencyLevel(NotificationPreference.FrequencyLevel.FREQUENT)
                .build();
        String expectedDedupKey = expectedDedupKey(userId, preference);

        when(notificationRepository.findByDedupKey(eq(expectedDedupKey)))
                .thenReturn(Optional.empty());
        when(notificationRepository.countPushSentSince(eq(userId), any()))
                .thenReturn(9L);

        NotificationDispatchService.DispatchDecision decision =
                service.evaluate(userId, Notification.NotificationType.DAILY_SUMMARY, preference);

        assertThat(decision).isEqualTo(NotificationDispatchService.DispatchDecision.IN_APP_ONLY);
        verify(notificationRepository).findByDedupKey(expectedDedupKey);
    }

    private String expectedDedupKey(Long userId, NotificationPreference preference) {
        ZoneId zone = NotificationDispatchService.resolveZone(preference);
        LocalDate expectedDate = LocalDate.now(FIXED_CLOCK.withZone(zone));
        return userId + ":DAILY_SUMMARY:" + expectedDate;
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
