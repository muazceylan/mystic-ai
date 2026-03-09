package com.mysticai.numerology.ingestion.dto.admin;

import java.util.Map;

public record ReviewQueueMergeRequest(
        String chosenSource,
        Long canonicalNameId,
        String canonicalNameOverride,
        Long fallbackCandidateId,
        Map<String, Long> selectedFieldCandidateIds,
        String reviewNote
) {
}
