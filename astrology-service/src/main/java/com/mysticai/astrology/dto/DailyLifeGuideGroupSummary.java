package com.mysticai.astrology.dto;

/**
 * Group-level summary row for the daily life guide.
 */
public record DailyLifeGuideGroupSummary(
        String groupKey,
        String groupLabel,
        int averageScore,
        int activityCount
) {}

