package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.ParsedGender;

import java.time.LocalDateTime;
import java.util.List;

public record AdminNameListItemDto(
        Long id,
        String name,
        String normalizedName,
        ParsedGender gender,
        String origin,
        String meaningShort,
        NameStatus status,
        Boolean quranFlag,
        Integer dataQualityScore,
        List<String> tagSummary,
        boolean hasAliases,
        long aliasCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
