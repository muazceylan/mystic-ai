package com.mysticai.numerology.ingestion.model;

public enum IngestionAnomalyType {
    PARSE_FAILURE_SPIKE,
    PARSE_SUCCESS_RATE_DROP,
    MISMATCH_RATIO_SPIKE,
    DUPLICATE_RATIO_SPIKE,
    LOW_QUALITY_RATIO_SPIKE,
    DISCOVERY_DROP,
    FETCH_DROP,
    FILL_RATE_DROP
}
