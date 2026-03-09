package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.IngestionTriggerType;
import com.mysticai.numerology.ingestion.model.SourceName;

import java.time.LocalDateTime;

public record RunningIngestionJobDto(
        SourceName sourceName,
        String ownerInstanceId,
        IngestionTriggerType triggerType,
        Long jobRunId,
        LocalDateTime startedAt,
        LocalDateTime heartbeatAt,
        boolean stale,
        long staleForSeconds
) {
}
