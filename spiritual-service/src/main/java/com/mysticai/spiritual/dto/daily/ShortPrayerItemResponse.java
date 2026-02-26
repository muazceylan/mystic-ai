package com.mysticai.spiritual.dto.daily;

public record ShortPrayerItemResponse(
        Long id,
        String title,
        String category,
        Integer recommendedRepeatCount,
        Integer estimatedReadSeconds,
        String sourceLabel
) {
}

