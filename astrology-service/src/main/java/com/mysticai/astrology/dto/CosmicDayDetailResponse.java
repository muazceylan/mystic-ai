package com.mysticai.astrology.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

public record CosmicDayDetailResponse(
        Long userId,
        LocalDate date,
        String locale,
        String moonPhase,
        boolean mercuryRetrograde,
        Map<String, CosmicCategoryDetail> categories,
        LocalDateTime generatedAt
) {}

