package com.mysticai.notification.dto;

import com.mysticai.notification.entity.NotificationPreference;

public record NotificationPreferenceResponse(
        Long userId,
        boolean dailyEnabled,
        boolean intradayEnabled,
        boolean weeklyEnabled,
        boolean plannerReminderEnabled,
        boolean prayerReminderEnabled,
        boolean meditationReminderEnabled,
        boolean dreamReminderEnabled,
        boolean eveningCheckinEnabled,
        boolean productUpdatesEnabled,
        String frequencyLevel,
        String preferredTimeSlot,
        String quietHoursStart,
        String quietHoursEnd,
        boolean pushEnabled,
        String timezone
) {
    public static NotificationPreferenceResponse from(NotificationPreference p) {
        return new NotificationPreferenceResponse(
                p.getUserId(),
                p.isDailyEnabled(),
                p.isIntradayEnabled(),
                p.isWeeklyEnabled(),
                p.isPlannerReminderEnabled(),
                p.isPrayerReminderEnabled(),
                p.isMeditationReminderEnabled(),
                p.isDreamReminderEnabled(),
                p.isEveningCheckinEnabled(),
                p.isProductUpdatesEnabled(),
                p.getFrequencyLevel().name(),
                p.getPreferredTimeSlot().name(),
                p.getQuietHoursStart().toString(),
                p.getQuietHoursEnd().toString(),
                p.isPushEnabled(),
                p.getTimezone()
        );
    }
}
