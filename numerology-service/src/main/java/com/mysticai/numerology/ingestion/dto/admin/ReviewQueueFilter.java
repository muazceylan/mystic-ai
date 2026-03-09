package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.ContentQuality;
import com.mysticai.numerology.ingestion.model.MergeReviewStatus;
import com.mysticai.numerology.ingestion.model.SourceName;

import java.util.Set;

public record ReviewQueueFilter(
        SourceName sourceName,
        Set<MergeReviewStatus> reviewStatuses,
        Boolean mismatchFlag,
        Boolean duplicateContentFlag,
        ContentQuality contentQuality,
        String canonicalName,
        Boolean hasConflict,
        boolean includeResolved
) {
}
