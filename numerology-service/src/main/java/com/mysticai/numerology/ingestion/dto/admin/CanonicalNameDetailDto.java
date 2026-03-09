package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.ParsedGender;

import java.time.LocalDateTime;
import java.util.List;

public record CanonicalNameDetailDto(
        Long id,
        String name,
        String normalizedName,
        ParsedGender gender,
        String origin,
        NameStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<NameAliasDto> aliases
) {
}
