package com.mysticai.numerology.ingestion.scraper;

import com.mysticai.numerology.ingestion.dto.ParsedNameCandidateDraft;
import com.mysticai.numerology.ingestion.dto.RawFetchPayload;
import com.mysticai.numerology.ingestion.entity.RawNameSourceEntry;
import com.mysticai.numerology.ingestion.model.SourceName;

import java.util.Optional;
import java.util.Set;

public interface NameSourceScraper {

    SourceName sourceName();

    Set<String> discoverDetailUrls();

    RawFetchPayload fetchRawEntry(String url);

    Optional<ParsedNameCandidateDraft> parse(RawNameSourceEntry rawEntry);
}
