package com.mysticai.astrology.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record CosmicPlannerResponse(
        Long userId,
        String month,
        String locale,
        Map<String, List<CosmicLegendItem>> legendsByCategory,
        List<CosmicPlannerDay> days,
        LocalDateTime generatedAt
) {}
