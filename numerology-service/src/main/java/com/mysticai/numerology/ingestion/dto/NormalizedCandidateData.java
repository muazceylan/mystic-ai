package com.mysticai.numerology.ingestion.dto;

import com.mysticai.numerology.ingestion.model.ContentQuality;
import com.mysticai.numerology.ingestion.model.ParsedGender;

import java.math.BigDecimal;

public record NormalizedCandidateData(
        String normalizedName,
        String displayName,
        ParsedGender gender,
        String meaningShort,
        String meaningLong,
        String origin,
        String characterTraitsText,
        String letterAnalysisText,
        Boolean quranFlag,
        BigDecimal sourceConfidence,
        boolean mismatchFlag,
        boolean duplicateContentFlag,
        ContentQuality contentQuality
) {
}
