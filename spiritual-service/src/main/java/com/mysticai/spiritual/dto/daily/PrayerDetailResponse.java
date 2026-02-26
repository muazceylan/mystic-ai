package com.mysticai.spiritual.dto.daily;

public record PrayerDetailResponse(
        Long id,
        String title,
        String category,
        String sourceLabel,
        String sourceNote,
        String arabicText,
        String transliterationTr,
        String meaningTr,
        Integer recommendedRepeatCount,
        Integer estimatedReadSeconds,
        Boolean isFavoritable,
        Boolean isFavorite,
        String disclaimerText
) {
}
