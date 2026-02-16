package com.mysticai.astrology.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Response record for periodic astrological analysis (weekly/monthly).
 */
public record PeriodicAnalysisResponse(
        Long id,
        Long userId,
        LocalDate startDate,
        LocalDate endDate,
        AnalysisType type,
        String sunSign,
        String moonSign,
        String risingSign,
        String overallTheme,
        String[] keyDates,
        String planetaryMovements,
        String recommendations,
        String mysticalGuidance,
        LocalDateTime createdAt
) {
    
    public enum AnalysisType {
        DAILY,
        WEEKLY,
        MONTHLY
    }
}
