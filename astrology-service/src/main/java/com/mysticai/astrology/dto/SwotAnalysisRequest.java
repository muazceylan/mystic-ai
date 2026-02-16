package com.mysticai.astrology.dto;

/**
 * Request record for SWOT astrological analysis.
 */
public record SwotAnalysisRequest(
        Long userId,
        String birthChart,
        String currentTransits,
        String question
) {}
