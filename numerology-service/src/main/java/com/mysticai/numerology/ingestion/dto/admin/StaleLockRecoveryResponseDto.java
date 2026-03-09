package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.IngestionJobLockStatus;
import com.mysticai.numerology.ingestion.model.SourceName;

import java.time.LocalDateTime;

public record StaleLockRecoveryResponseDto(
        SourceName sourceName,
        boolean recovered,
        String message,
        IngestionJobLockStatus previousStatus,
        IngestionJobLockStatus currentStatus,
        LocalDateTime previousHeartbeatAt,
        LocalDateTime recoveredAt
) {
}
