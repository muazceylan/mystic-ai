package com.mysticai.numerology.ingestion.dto;

import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.model.SourceName;

public record ParsedNameCandidateDraft(
        String name,
        ParsedGender gender,
        String meaningShort,
        String meaningLong,
        String origin,
        String characterTraitsText,
        String letterAnalysisText,
        Boolean quranFlag,
        SourceName sourceName,
        String sourceUrl,
        double sourceConfidence
) {
}
