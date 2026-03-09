package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.SourceName;

public record ReviewQueueConflictValueDto(
        Long candidateId,
        SourceName sourceName,
        String displayName,
        String value
) {
}
