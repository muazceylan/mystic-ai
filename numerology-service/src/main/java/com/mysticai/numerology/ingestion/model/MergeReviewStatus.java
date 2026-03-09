package com.mysticai.numerology.ingestion.model;

public enum MergeReviewStatus {
    PENDING,
    IN_REVIEW,
    SKIPPED,
    APPROVED,
    REJECTED,
    MERGED;

    public boolean isTerminal() {
        return this == APPROVED || this == REJECTED || this == MERGED;
    }

    public boolean isActiveQueue() {
        return this == PENDING || this == IN_REVIEW;
    }
}
