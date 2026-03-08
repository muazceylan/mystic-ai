package com.mysticai.notification.service;

import com.mysticai.notification.dto.NotificationPreferenceRequest;
import com.mysticai.notification.entity.NotificationPreference;
import com.mysticai.notification.repository.NotificationPreferenceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationPreferenceService {

    private final NotificationPreferenceRepository preferenceRepository;

    public NotificationPreference getOrCreate(Long userId) {
        return preferenceRepository.findById(userId)
                .orElseGet(() -> {
                    NotificationPreference pref = NotificationPreference.builder()
                            .userId(userId)
                            .build();
                    return preferenceRepository.save(pref);
                });
    }

    @Transactional
    public NotificationPreference update(Long userId, NotificationPreferenceRequest request) {
        NotificationPreference pref = getOrCreate(userId);

        if (request.dailyEnabled() != null) pref.setDailyEnabled(request.dailyEnabled());
        if (request.intradayEnabled() != null) pref.setIntradayEnabled(request.intradayEnabled());
        if (request.weeklyEnabled() != null) pref.setWeeklyEnabled(request.weeklyEnabled());
        if (request.plannerReminderEnabled() != null) pref.setPlannerReminderEnabled(request.plannerReminderEnabled());
        if (request.prayerReminderEnabled() != null) pref.setPrayerReminderEnabled(request.prayerReminderEnabled());
        if (request.meditationReminderEnabled() != null) pref.setMeditationReminderEnabled(request.meditationReminderEnabled());
        if (request.dreamReminderEnabled() != null) pref.setDreamReminderEnabled(request.dreamReminderEnabled());
        if (request.eveningCheckinEnabled() != null) pref.setEveningCheckinEnabled(request.eveningCheckinEnabled());
        if (request.productUpdatesEnabled() != null) pref.setProductUpdatesEnabled(request.productUpdatesEnabled());
        if (request.pushEnabled() != null) pref.setPushEnabled(request.pushEnabled());
        if (request.timezone() != null) pref.setTimezone(request.timezone());

        if (request.frequencyLevel() != null) {
            try {
                pref.setFrequencyLevel(NotificationPreference.FrequencyLevel.valueOf(request.frequencyLevel()));
            } catch (IllegalArgumentException ignored) {}
        }
        if (request.preferredTimeSlot() != null) {
            try {
                pref.setPreferredTimeSlot(NotificationPreference.TimeSlot.valueOf(request.preferredTimeSlot()));
            } catch (IllegalArgumentException ignored) {}
        }
        if (request.quietHoursStart() != null) {
            try { pref.setQuietHoursStart(LocalTime.parse(request.quietHoursStart())); }
            catch (Exception ignored) {}
        }
        if (request.quietHoursEnd() != null) {
            try { pref.setQuietHoursEnd(LocalTime.parse(request.quietHoursEnd())); }
            catch (Exception ignored) {}
        }

        return preferenceRepository.save(pref);
    }
}
