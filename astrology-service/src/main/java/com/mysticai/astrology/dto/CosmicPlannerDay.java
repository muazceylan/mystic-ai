package com.mysticai.astrology.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record CosmicPlannerDay(
        LocalDate date,
        int overallScore,
        Map<String, Integer> categoryScores,
        Map<String, List<CosmicPlannerSubcategoryDot>> dotsByCategory
) {}
