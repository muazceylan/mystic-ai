package com.mysticai.numerology.ingestion.dto.admin;

public record CanonicalBackfillResponse(
        int canonicalCount,
        int aliasUpsertCount,
        int candidateUpdatedCount,
        int queueRefreshCount
) {
}
