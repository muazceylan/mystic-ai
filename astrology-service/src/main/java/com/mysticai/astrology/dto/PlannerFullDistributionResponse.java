package com.mysticai.astrology.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Full daily planner distribution response.
 */
public record PlannerFullDistributionResponse(
        Long userId,
        int monthsAhead,
        LocalDate startDate,
        LocalDate endDate,
        List<PlannerDayInsight> days,
        LocalDateTime generatedAt
) {}
