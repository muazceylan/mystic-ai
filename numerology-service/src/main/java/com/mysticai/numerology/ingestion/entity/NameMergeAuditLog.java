package com.mysticai.numerology.ingestion.entity;

import com.mysticai.numerology.ingestion.model.MergeReviewStatus;
import com.mysticai.numerology.ingestion.model.ReviewQueueActionType;
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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "name_merge_audit_logs", indexes = {
        @Index(name = "idx_name_merge_audit_queue_id", columnList = "queue_id"),
        @Index(name = "idx_name_merge_audit_canonical_name", columnList = "canonical_name"),
        @Index(name = "idx_name_merge_audit_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NameMergeAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "queue_id")
    private Long queueId;

    @Column(name = "canonical_name", nullable = false, length = 255)
    private String canonicalName;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 24)
    private ReviewQueueActionType actionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "previous_status", length = 24)
    private MergeReviewStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false, length = 24)
    private MergeReviewStatus newStatus;

    @Column(name = "selected_candidate_id")
    private Long selectedCandidateId;

    @Enumerated(EnumType.STRING)
    @Column(name = "selected_source", length = 64)
    private SourceName selectedSource;

    @Column(name = "selected_field_sources", columnDefinition = "TEXT")
    private String selectedFieldSources;

    @Column(name = "review_note", columnDefinition = "TEXT")
    private String reviewNote;

    @Column(name = "action_payload", columnDefinition = "TEXT")
    private String actionPayload;

    @Column(name = "acted_by", length = 255)
    private String actedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @jakarta.persistence.PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
