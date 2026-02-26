package com.mysticai.spiritual.dto.daily;

public record PrayerSetItemResponse(
        int order,
        Long prayerId,
        String title,
        String category,
        Integer recommendedRepeatCount,
        Integer estimatedReadSeconds,
        int userProgressCount,
        boolean isCompletedToday
) {
}

