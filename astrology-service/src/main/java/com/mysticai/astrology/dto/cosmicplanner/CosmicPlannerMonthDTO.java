package com.mysticai.astrology.dto.cosmicplanner;

import java.util.List;

public record CosmicPlannerMonthDTO(
        int year,
        int month,
        List<CosmicPlannerMonthDayDTO> days,
        String generatedAt
) {}
