package com.mysticai.astrology.dto.cosmicplanner;

import java.util.List;

public record DockCategoryDTO(
        String key,
        String title,
        int score,
        String summary,
        List<RecommendationItemDTO> doItems,
        List<RecommendationItemDTO> avoidItems
) {}
