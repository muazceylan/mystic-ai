package com.mysticai.spiritual.dto.stats;

public record WeeklyStatsResponse(
        String week,
        int totalPrayerRepeats,
        int totalAsmaRepeats,
        int totalMeditationSec,
        TopPrayerSummary topPrayer,
        int streakDays,
        int activeDays
) {
    public record TopPrayerSummary(
            Long prayerId,
            String title,
            int repeatCount
    ) {
    }
}

