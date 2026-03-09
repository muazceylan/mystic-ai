package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.MergeReviewStatus;
import com.mysticai.numerology.ingestion.model.SourceName;

import java.util.Map;

public record ReviewQueueActionResponse(
        Long queueId,
        String canonicalName,
        MergeReviewStatus reviewStatus,
        Long nameId,
        Long auditId,
        Long selectedCandidateId,
        SourceName selectedSource,
        Map<String, SourceName> selectedFieldSources,
        String reviewNote
) {
}
