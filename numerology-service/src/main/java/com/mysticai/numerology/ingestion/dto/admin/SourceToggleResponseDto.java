package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.SourceName;

import java.time.LocalDateTime;

public record SourceToggleResponseDto(
        SourceName sourceName,
        boolean enabled,
        String updatedBy,
        LocalDateTime updatedAt
) {
}
