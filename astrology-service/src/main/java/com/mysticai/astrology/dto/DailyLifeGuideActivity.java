package com.mysticai.astrology.dto;

import java.util.List;

/**
 * Activity-level score and explanations for the daily life guide.
 */
public record DailyLifeGuideActivity(
        String groupKey,
        String groupLabel,
        String activityKey,
        String activityLabel,
        String icon,
        int score,
        String tone,
        String statusLabel,
        String shortAdvice,
        String technicalExplanation,
        String insight,
        List<String> triggerNotes
) {}

