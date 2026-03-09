package com.mysticai.numerology.ingestion.dto.admin;

public record AdminNameCanonicalInfoDto(
        Long canonicalId,
        String canonicalName,
        String canonicalNormalizedName
) {
}
