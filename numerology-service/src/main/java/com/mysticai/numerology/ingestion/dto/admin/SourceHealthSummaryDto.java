package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.SourceName;

import java.time.LocalDateTime;
import java.util.List;

public record SourceHealthSummaryDto(
        SourceName sourceName,
        boolean enabled,
        LocalDateTime lastRunAt,
        LocalDateTime lastSuccessAt,
        LocalDateTime lastFailureAt,
        String lastErrorMessage,
        int lastDiscoveredCount,
        int lastFetchedCount,
        int lastParseSuccessCount,
        int lastParseFailureCount,
        double parseSuccessRate,
        long conflictCount,
        long mismatchCount,
        long duplicateCount,
        long lowQualityCount,
        long reviewBacklogCount,
        long approvedWriteCount,
        long canonicalResolvedCount,
        boolean hasAnomaly,
        List<String> anomalyTypes,
        String anomalyReasonSummary,
        int recentRunCount
) {
}
