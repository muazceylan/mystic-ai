package com.mysticai.numerology.ingestion.entity;

import com.mysticai.numerology.ingestion.model.MergeReviewStatus;
import com.mysticai.numerology.ingestion.model.MergeRecommendationStatus;
import com.mysticai.numerology.ingestion.model.SourceName;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "name_merge_queue",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_name_merge_queue_canonical_name", columnNames = "canonical_name")
        },
        indexes = {
                @Index(name = "idx_name_merge_queue_review_status", columnList = "review_status"),
                @Index(name = "idx_name_merge_queue_has_conflict", columnList = "has_conflict"),
                @Index(name = "idx_name_merge_queue_updated_at", columnList = "updated_at")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NameMergeQueue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "canonical_name", nullable = false, length = 255)
    private String canonicalName;

    @Column(name = "candidate_ids", nullable = false, columnDefinition = "TEXT")
    private String candidateIds;

    @Column(name = "conflicting_fields", nullable = false, columnDefinition = "TEXT")
    private String conflictingFields;

    @Column(name = "has_conflict", nullable = false)
    private boolean hasConflict;

    @Enumerated(EnumType.STRING)
    @Column(name = "chosen_source", length = 64)
    private SourceName chosenSource;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false, length = 24)
    private MergeReviewStatus reviewStatus;

    @Column(name = "review_note", columnDefinition = "TEXT")
    private String reviewNote;

    @Enumerated(EnumType.STRING)
    @Column(name = "merge_recommendation_status", nullable = false, length = 32)
    private MergeRecommendationStatus mergeRecommendationStatus;

    @Column(name = "recommended_canonical_name_id")
    private Long recommendedCanonicalNameId;

    @Column(name = "recommended_canonical_name", length = 255)
    private String recommendedCanonicalName;

    @Column(name = "recommended_field_sources", columnDefinition = "TEXT")
    private String recommendedFieldSources;

    @Column(name = "auto_merge_eligible", nullable = false)
    private boolean autoMergeEligible;

    @Column(name = "auto_merge_reason_summary", columnDefinition = "TEXT")
    private String autoMergeReasonSummary;

    @Column(name = "merge_confidence", precision = 5, scale = 3)
    private java.math.BigDecimal mergeConfidence;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @jakarta.persistence.PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (reviewStatus == null) {
            reviewStatus = MergeReviewStatus.PENDING;
        }
        if (mergeRecommendationStatus == null) {
            mergeRecommendationStatus = MergeRecommendationStatus.MANUAL_REVIEW_REQUIRED;
        }
        if (candidateIds == null || candidateIds.isBlank()) {
            candidateIds = "[]";
        }
        if (conflictingFields == null || conflictingFields.isBlank()) {
            conflictingFields = "[]";
        }
        hasConflict = hasConflict || !"[]".equals(conflictingFields);
        autoMergeEligible = autoMergeEligible || mergeRecommendationStatus.isAutoMergeEligible();
        createdAt = now;
        updatedAt = now;
    }

    @jakarta.persistence.PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
