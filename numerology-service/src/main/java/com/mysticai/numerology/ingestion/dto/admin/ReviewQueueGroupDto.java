package com.mysticai.numerology.ingestion.dto.admin;

import com.mysticai.numerology.ingestion.model.MergeReviewStatus;
import com.mysticai.numerology.ingestion.model.MergeRecommendationStatus;
import com.mysticai.numerology.ingestion.model.SourceName;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record ReviewQueueGroupDto(
        Long queueId,
        String canonicalName,
        MergeReviewStatus reviewStatus,
        SourceName chosenSource,
        String reviewNote,
        boolean hasConflict,
        List<String> conflictingFields,
        List<ReviewQueueConflictFieldDto> conflictDetails,
        List<ReviewQueueCandidateDto> candidates,
        MergeRecommendationStatus mergeRecommendationStatus,
        Long recommendedCanonicalNameId,
        String recommendedCanonicalName,
        Map<String, SourceName> recommendedFieldSources,
        boolean autoMergeEligible,
        String autoMergeReasonSummary,
        BigDecimal mergeConfidence,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
