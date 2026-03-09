package com.mysticai.numerology.ingestion.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.numerology.ingestion.entity.ParsedNameCandidate;
import com.mysticai.numerology.ingestion.entity.RawNameSourceEntry;
import com.mysticai.numerology.ingestion.model.ContentQuality;
import com.mysticai.numerology.ingestion.model.ParsedGender;
import com.mysticai.numerology.ingestion.model.SourceName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class NameMergeServiceConflictTest {

    @Test
    void detectConflicts_flagsOriginAndMeaningDifferences() {
        NameMergeService service = new NameMergeService(
                null,
                null,
                null,
                null,
                null,
                new ObjectMapper()
        );

        ParsedNameCandidate first = candidate("Ali", "ali", "Arapça", "Yüce");
        ParsedNameCandidate second = candidate("Ali", "ali", "Türkçe", "Yüksek");

        List<String> conflicts = service.detectConflicts(List.of(first, second));

        assertTrue(conflicts.contains("origin"));
        assertTrue(conflicts.contains("meaning_short"));
    }

    private ParsedNameCandidate candidate(String displayName, String normalizedName, String origin, String meaningShort) {
        RawNameSourceEntry raw = RawNameSourceEntry.builder().sourceName(SourceName.BEBEKISMI).build();
        ParsedNameCandidate candidate = new ParsedNameCandidate();
        candidate.setRawEntry(raw);
        candidate.setDisplayName(displayName);
        candidate.setNormalizedName(normalizedName);
        candidate.setOrigin(origin);
        candidate.setMeaningShort(meaningShort);
        candidate.setMeaningLong(meaningShort);
        candidate.setGender(ParsedGender.MALE);
        candidate.setSourceConfidence(BigDecimal.valueOf(0.7));
        candidate.setContentQuality(ContentQuality.MEDIUM);
        return candidate;
    }
}
