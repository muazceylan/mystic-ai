package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.ContentQuality;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.model.SourceName;

import java.math.BigDecimal;

public record ReviewQueueCandidateDto(
        Long candidateId,
        Long rawEntryId,
        SourceName sourceName,
        String sourceUrl,
        String displayName,
        String normalizedName,
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
