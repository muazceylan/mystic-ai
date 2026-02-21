package com.mysticai.astrology.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Daily planner insight containing all planner categories.
 */
public record PlannerDayInsight(
        LocalDate date,
        int overallScore,
        List<PlannerCategoryAction> categories
) {}
