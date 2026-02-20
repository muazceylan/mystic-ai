package com.mysticai.astrology.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record LuckyDatesResponse(
        Long userId,
        GoalCategory goalCategory,
        String hookText,
        List<LuckyDateCard> luckyDates,
        String aiInterpretation,
        String status,
        UUID correlationId,
        LocalDateTime generatedAt
) {}
