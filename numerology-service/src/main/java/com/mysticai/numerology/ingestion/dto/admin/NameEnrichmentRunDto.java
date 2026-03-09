package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.NameEnrichmentRunStatus;
import com.mysticai.numerology.ingestion.model.NameEnrichmentTriggerType;

import java.time.LocalDateTime;

public record NameEnrichmentRunDto(
        Long id,
        NameEnrichmentTriggerType triggerType,
        NameEnrichmentRunStatus status,
        String enrichmentVersion,
        int processedCount,
        int updatedCount,
        int skippedCount,
        int lowConfidenceCount,
        int errorCount,
        LocalDateTime startedAt,
        LocalDateTime finishedAt,
        String errorSummary,
        String triggeredBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
