package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.AliasMatchLevel;
import com.mysticai.numerology.ingestion.model.AliasType;

public record CanonicalResolutionDto(
        String inputName,
        String normalizedInputName,
        AliasMatchLevel matchLevel,
        Long canonicalNameId,
        String canonicalName,
        String canonicalNormalizedName,
        AliasType matchedAliasType,
        boolean autoGroup
) {
}
