package com.mysticai.numerology.dto;

import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.ParsedGender;

import java.util.List;

public record PublicNameListItemDto(
        Long id,
        String name,
        String normalizedName,
        ParsedGender gender,
        String origin,
        String meaningShort,
        Boolean quranFlag,
        NameStatus status,
        List<PublicNameTagDto> tags
) {
}
