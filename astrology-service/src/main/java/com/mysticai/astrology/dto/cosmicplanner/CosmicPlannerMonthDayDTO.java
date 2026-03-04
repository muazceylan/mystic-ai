package com.mysticai.astrology.dto.cosmicplanner;

import java.time.LocalDate;

public record CosmicPlannerMonthDayDTO(
        LocalDate date,
        int score,
        CosmicBand band,
        CategoryDotsDTO categoryDots,
        String topCategory
) {}
