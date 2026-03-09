package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.NameStatus;
import com.mysticai.numerology.ingestion.model.ParsedGender;

public record AdminNameUpdateRequest(
        String name,
        ParsedGender gender,
        String origin,
        String meaningShort,
        String meaningLong,
        String characterTraitsText,
        String letterAnalysisText,
        Boolean quranFlag,
        NameStatus status
) {
}
