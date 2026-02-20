package com.mysticai.oracle.dto;

import java.util.List;

/**
 * Record representing the Grand Synthesis request data.
 * Combines all mystical data sources for AI analysis.
 */
public record GrandSynthesisRequest(
        NumerologyData numerology,
        NatalChartData natalChart,
        DreamData recentDream,
        String moonPhase,
        String moonSignToday,
        List<String> retrogradePlanets
) {
}
