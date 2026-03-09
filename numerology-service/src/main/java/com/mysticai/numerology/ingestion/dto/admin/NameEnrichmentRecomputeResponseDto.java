package com.mysticai.numerology.ingestion.dto.admin;

public record NameEnrichmentRecomputeResponseDto(
        Long nameId,
        boolean updated,
        int insertedTagCount,
        int removedRuleTagCount,
        int lowConfidenceCount,
        NameEnrichmentRunDto run
) {
}
