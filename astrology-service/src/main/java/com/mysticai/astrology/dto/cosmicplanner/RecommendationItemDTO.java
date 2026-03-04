package com.mysticai.astrology.dto.cosmicplanner;

public record RecommendationItemDTO(
        String id,
        String title,
        String description,
        RecommendationSeverity severity,
        String categoryKey,
        RecommendationActionType actionType
) {}
