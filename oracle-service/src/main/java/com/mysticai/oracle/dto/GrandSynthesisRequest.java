package com.mysticai.oracle.dto;

/**
 * Record representing the Grand Synthesis request data.
 * Combines all mystical data sources for AI analysis.
 */
public record GrandSynthesisRequest(
        NumerologyData numerology,
        NatalChartData natalChart,
        DreamData recentDream,
        String currentTransits
) {
}
