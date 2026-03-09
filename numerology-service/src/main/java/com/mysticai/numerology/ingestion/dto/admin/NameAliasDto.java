package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.AliasType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record NameAliasDto(
        Long id,
        Long canonicalNameId,
        String canonicalName,
        String canonicalNormalizedName,
        String aliasName,
        String normalizedAliasName,
        AliasType aliasType,
        BigDecimal confidence,
        boolean isManual,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
