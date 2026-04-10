package com.mysticai.numerology.dto;

import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.ParsedGender;

import java.time.LocalDateTime;
import java.util.List;

public record PublicNameDetailDto(
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
        List<PublicNameTagDto> tags,
        List<PublicNameAliasDto> aliases,
        LocalDateTime updatedAt
) {
}
