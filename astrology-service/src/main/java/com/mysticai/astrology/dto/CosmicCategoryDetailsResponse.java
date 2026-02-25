package com.mysticai.astrology.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record CosmicCategoryDetailsResponse(
        Long userId,
        LocalDate date,
        String locale,
        String categoryKey,
        String moonPhase,
        boolean mercuryRetrograde,
        CosmicCategoryDetail category,
        LocalDateTime generatedAt
) {}
