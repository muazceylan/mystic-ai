package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.IngestionRunStatus;
import com.mysticai.numerology.ingestion.model.IngestionTriggerType;
import com.mysticai.numerology.ingestion.model.SourceName;

import java.time.LocalDateTime;

public record NameIngestionRunDto(
        Long id,
        SourceName sourceName,
        IngestionTriggerType triggerType,
        IngestionRunStatus status,
        LocalDateTime startedAt,
        LocalDateTime finishedAt,
        Long durationMs,
        int discoveredCount,
        int fetchedCount,
        int parseSuccessCount,
        int parseFailureCount,
        int conflictCount,
        int mismatchCount,
        int duplicateCount,
        int lowQualityCount,
        int reviewBacklogCountSnapshot,
        int approvedWriteCount,
        int canonicalResolvedCount,
        int originFilledCount,
        int meaningShortFilledCount,
        int meaningLongFilledCount,
        double parseSuccessRate,
        String errorSummary,
        String triggeredBy
) {
}
