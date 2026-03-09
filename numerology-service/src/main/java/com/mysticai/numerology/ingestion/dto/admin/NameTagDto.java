package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.NameTagGroup;
import com.mysticai.numerology.ingestion.model.NameTagSource;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record NameTagDto(
        Long id,
        Long nameId,
        NameTagGroup tagGroup,
        String tagValue,
        String normalizedTag,
        NameTagSource source,
        BigDecimal confidence,
        String evidence,
        Integer enrichmentVersion,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
