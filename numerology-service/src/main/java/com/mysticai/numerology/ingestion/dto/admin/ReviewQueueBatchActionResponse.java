package com.mysticai.numerology.ingestion.dto.admin;

import java.util.List;

public record ReviewQueueBatchActionResponse(
        int processed,
        int succeeded,
        int failed,
        List<ReviewQueueBatchActionResult> results
) {
}
