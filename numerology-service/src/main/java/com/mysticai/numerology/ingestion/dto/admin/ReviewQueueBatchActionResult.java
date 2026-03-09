package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.MergeReviewStatus;

public record ReviewQueueBatchActionResult(
        Long queueId,
        boolean success,
        MergeReviewStatus reviewStatus,
        Long nameId,
        String error
) {
}
