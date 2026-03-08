package com.mysticai.notification.dto;

public record NotificationPreferenceRequest(
        Boolean dailyEnabled,
        Boolean intradayEnabled,
        Boolean weeklyEnabled,
        Boolean plannerReminderEnabled,
        Boolean prayerReminderEnabled,
        Boolean meditationReminderEnabled,
        Boolean dreamReminderEnabled,
        Boolean eveningCheckinEnabled,
        Boolean productUpdatesEnabled,
        String frequencyLevel,
        String preferredTimeSlot,
        String quietHoursStart,
        String quietHoursEnd,
        Boolean pushEnabled,
        String timezone
) {}
