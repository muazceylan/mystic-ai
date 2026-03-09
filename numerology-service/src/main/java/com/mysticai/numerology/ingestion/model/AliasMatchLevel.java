package com.mysticai.numerology.ingestion.model;

public enum AliasMatchLevel {
    EXACT,
    STRONG_ALIAS,
    WEAK_ALIAS,
    NO_MATCH;

    public boolean canAutoGroup() {
        return this == EXACT || this == STRONG_ALIAS;
    }
}
