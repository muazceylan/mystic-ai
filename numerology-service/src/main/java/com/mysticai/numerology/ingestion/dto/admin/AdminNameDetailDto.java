package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.ParsedGender;

import java.time.LocalDateTime;
import java.util.List;

public record AdminNameDetailDto(
        Long id,
        String name,
        String normalizedName,
        ParsedGender gender,
        String origin,
        String meaningShort,
        String meaningLong,
        String characterTraitsText,
        String letterAnalysisText,
        Boolean quranFlag,
        NameStatus status,
        Integer dataQualityScore,
        List<String> tagSummary,
        AdminNameCanonicalInfoDto canonicalInfo,
        List<NameAliasDto> aliases,
        List<NameTagDto> tags,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
