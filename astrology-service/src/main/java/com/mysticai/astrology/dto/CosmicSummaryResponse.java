package com.mysticai.astrology.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record CosmicSummaryResponse(
        Long userId,
        String date,
        String locale,
        DailyLifeGuideResponse dailyGuide,
        Map<String, Integer> categoryScores,
        List<CosmicSummaryCard> focusCards,
        LocalDateTime generatedAt
) {}
