package com.mysticai.numerology.ingestion.dto.admin;

import java.util.List;

public record ReviewQueueConflictFieldDto(
        String field,
        List<ReviewQueueConflictValueDto> values
) {
}
