package com.mysticai.numerology.ingestion.dto;

import com.mysticai.numerology.ingestion.model.ParseStatus;
import com.mysticai.numerology.ingestion.model.SourceName;

import java.time.LocalDateTime;

public record RawFetchPayload(
        SourceName sourceName,
        String sourceUrl,
        String externalName,
        String rawTitle,
        String rawHtml,
        String rawText,
        LocalDateTime fetchedAt,
        int httpStatus,
        ParseStatus parseStatus,
        String checksum
) {
}
