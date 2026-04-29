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
                frequencyLevel(p).name(),
                preferredTimeSlot(p).name(),
                quietHoursStart(p),
                quietHoursEnd(p),
                p.isPushEnabled(),
                timezone(p)
        );
    }

    private static NotificationPreference.FrequencyLevel frequencyLevel(NotificationPreference p) {
        return p.getFrequencyLevel() != null
                ? p.getFrequencyLevel()
                : NotificationPreference.DEFAULT_FREQUENCY_LEVEL;
    }

    private static NotificationPreference.TimeSlot preferredTimeSlot(NotificationPreference p) {
        return p.getPreferredTimeSlot() != null
                ? p.getPreferredTimeSlot()
                : NotificationPreference.DEFAULT_PREFERRED_TIME_SLOT;
    }

    private static String quietHoursStart(NotificationPreference p) {
        return (p.getQuietHoursStart() != null
                ? p.getQuietHoursStart()
                : NotificationPreference.DEFAULT_QUIET_HOURS_START).toString();
    }

    private static String quietHoursEnd(NotificationPreference p) {
        return (p.getQuietHoursEnd() != null
                ? p.getQuietHoursEnd()
                : NotificationPreference.DEFAULT_QUIET_HOURS_END).toString();
    }

    private static String timezone(NotificationPreference p) {
        return p.getTimezone() != null && !p.getTimezone().isBlank()
                ? p.getTimezone()
                : NotificationPreference.DEFAULT_TIMEZONE;
    }
}
