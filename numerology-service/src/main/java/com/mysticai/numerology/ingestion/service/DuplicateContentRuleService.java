package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.entity.ParsedNameCandidate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class DuplicateContentRuleService {

    public boolean hasDuplicates(List<ParsedNameCandidate> duplicates) {
        return duplicates != null && !duplicates.isEmpty();
    }

    public void applyDuplicatePenalty(List<ParsedNameCandidate> duplicates) {
        if (duplicates == null) {
            return;
        }
        for (ParsedNameCandidate duplicate : duplicates) {
            if (duplicate.isDuplicateContentFlag()) {
                continue;
            }
            duplicate.setDuplicateContentFlag(true);
            BigDecimal adjusted = duplicate.getSourceConfidence().subtract(BigDecimal.valueOf(0.10));
            if (adjusted.doubleValue() < 0.10) {
                adjusted = BigDecimal.valueOf(0.10);
            }
            duplicate.setSourceConfidence(adjusted);
        }
    }
}
