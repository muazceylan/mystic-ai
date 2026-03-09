package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.entity.ParsedNameCandidate;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DuplicateContentRuleServiceTest {

    private final DuplicateContentRuleService service = new DuplicateContentRuleService();

    @Test
    void applyDuplicatePenalty_marksFlagsAndReducesConfidence() {
        ParsedNameCandidate candidate = new ParsedNameCandidate();
        candidate.setDuplicateContentFlag(false);
        candidate.setSourceConfidence(BigDecimal.valueOf(0.45));

        List<ParsedNameCandidate> duplicates = new ArrayList<>();
        duplicates.add(candidate);

        assertTrue(service.hasDuplicates(duplicates));
        service.applyDuplicatePenalty(duplicates);

        assertTrue(candidate.isDuplicateContentFlag());
        assertEquals(BigDecimal.valueOf(0.35), candidate.getSourceConfidence());
    }

    @Test
    void applyDuplicatePenalty_usesFloorAtPointOne() {
        ParsedNameCandidate candidate = new ParsedNameCandidate();
        candidate.setDuplicateContentFlag(false);
        candidate.setSourceConfidence(BigDecimal.valueOf(0.12));

        service.applyDuplicatePenalty(List.of(candidate));

        assertEquals(BigDecimal.valueOf(0.10), candidate.getSourceConfidence());
    }
}
