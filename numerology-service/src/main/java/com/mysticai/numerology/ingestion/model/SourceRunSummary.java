package com.mysticai.numerology.ingestion.model;

import java.time.Instant;

public record SourceRunSummary(
        SourceName source,
        int discoveredCount,
        int fetchedCount,
        int fetchFailedCount,
        int parsedSuccessCount,
        int parsedFailedCount,
        int conflictCount,
        int reviewQueuedCount,
        Instant startedAt,
        Instant finishedAt
) {
}
