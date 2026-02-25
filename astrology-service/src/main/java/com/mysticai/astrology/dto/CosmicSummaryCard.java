package com.mysticai.astrology.dto;

public record CosmicSummaryCard(
        String categoryKey,
        String subCategoryKey,
        String categoryLabel,
        String activityKey,
        String activityLabel,
        int score,
        String type,
        String shortAdvice,
        String colorHex
) {}
