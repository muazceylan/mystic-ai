package com.mysticai.numerology.ingestion.model;

public enum MergeRecommendationStatus {
    AUTO_MERGE_ELIGIBLE,
    MERGE_SUGGESTED,
    MANUAL_REVIEW_REQUIRED;

    public boolean isAutoMergeEligible() {
        return this == AUTO_MERGE_ELIGIBLE;
    }
}
