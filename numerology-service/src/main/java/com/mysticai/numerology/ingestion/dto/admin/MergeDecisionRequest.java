package com.mysticai.numerology.ingestion.dto.admin;

public record MergeDecisionRequest(
        String chosenSource,
        String reviewNote
) {
}
