package com.mysticai.numerology.ingestion.dto.admin;

import java.util.List;

public record ReviewQueueBatchActionRequest(
        List<Long> queueIds,
        String chosenSource,
        String reviewNote
) {
}
