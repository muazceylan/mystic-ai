package com.mysticai.astrology.dto;

/**
 * Request record for periodic astrological analysis.
 */
public record PeriodicAnalysisRequest(
        Long userId,
        String sunSign,
        String moonSign,
        String risingSign,
        String period, // DAILY, WEEKLY, MONTHLY
        String natalChartSummary
) {}
