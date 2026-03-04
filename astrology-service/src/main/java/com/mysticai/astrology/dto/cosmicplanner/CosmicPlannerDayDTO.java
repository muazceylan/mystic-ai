package com.mysticai.astrology.dto.cosmicplanner;

import java.time.LocalDate;
import java.util.List;

public record CosmicPlannerDayDTO(
        LocalDate date,
        int overallScore,
        CosmicBand band,
        String whySummary,
        List<RecommendationItemDTO> doItems,
        List<RecommendationItemDTO> avoidItems,
        List<TimeWindowDTO> timing,
        List<CategoryScoreDTO> categories,
        String generatedAt
) {}
