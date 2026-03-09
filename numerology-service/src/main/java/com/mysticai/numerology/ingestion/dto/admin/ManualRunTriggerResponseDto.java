package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.IngestionJobLockStatus;
import com.mysticai.numerology.ingestion.model.ManualRunRejectionReason;
import com.mysticai.numerology.ingestion.model.SourceName;
import com.mysticai.numerology.ingestion.model.SourceRunSummary;

public record ManualRunTriggerResponseDto(
        SourceName sourceName,
        boolean accepted,
        ManualRunRejectionReason rejectionReason,
        String message,
        SourceRunSummary runSummary,
        String lockOwnerInstanceId,
        Long runningJobRunId,
        IngestionJobLockStatus lockStatus,
        boolean staleLock
) {
}
