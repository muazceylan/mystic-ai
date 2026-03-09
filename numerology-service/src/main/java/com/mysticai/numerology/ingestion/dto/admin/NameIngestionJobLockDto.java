package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.IngestionJobLockStatus;
import com.mysticai.numerology.ingestion.model.IngestionTriggerType;
import com.mysticai.numerology.ingestion.model.SourceName;

import java.time.LocalDateTime;

public record NameIngestionJobLockDto(
        Long id,
        SourceName sourceName,
        String lockKey,
        IngestionJobLockStatus status,
        String ownerInstanceId,
        IngestionTriggerType triggerType,
        Long jobRunId,
        LocalDateTime startedAt,
        LocalDateTime heartbeatAt,
        LocalDateTime releasedAt,
        String releaseReason,
        boolean stale,
        long staleForSeconds,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
