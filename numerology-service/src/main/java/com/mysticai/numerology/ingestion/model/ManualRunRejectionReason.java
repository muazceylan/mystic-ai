package com.mysticai.numerology.ingestion.model;

public enum ManualRunRejectionReason {
    NONE,
    SOURCE_DISABLED,
    ALREADY_RUNNING,
    LOCK_STALE,
    LOCK_ERROR
}
