package com.mysticai.numerology.ingestion.entity;

import com.mysticai.numerology.ingestion.model.IngestionRunStatus;
import com.mysticai.numerology.ingestion.model.IngestionTriggerType;
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
@Table(name = "name_ingestion_runs", indexes = {
        @Index(name = "idx_name_ingestion_runs_source_started", columnList = "source_name, started_at"),
        @Index(name = "idx_name_ingestion_runs_source_finished", columnList = "source_name, finished_at"),
        @Index(name = "idx_name_ingestion_runs_status", columnList = "status"),
        @Index(name = "idx_name_ingestion_runs_trigger_type", columnList = "trigger_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NameIngestionRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_name", nullable = false, length = 64)
    private SourceName sourceName;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", nullable = false, length = 24)
    private IngestionTriggerType triggerType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 24)
    private IngestionRunStatus status;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "discovered_count", nullable = false)
    private int discoveredCount;

    @Column(name = "fetched_count", nullable = false)
    private int fetchedCount;

    @Column(name = "parse_success_count", nullable = false)
    private int parseSuccessCount;

    @Column(name = "parse_failure_count", nullable = false)
    private int parseFailureCount;

    @Column(name = "conflict_count", nullable = false)
    private int conflictCount;

    @Column(name = "mismatch_count", nullable = false)
    private int mismatchCount;

    @Column(name = "duplicate_count", nullable = false)
    private int duplicateCount;

    @Column(name = "low_quality_count", nullable = false)
    private int lowQualityCount;

    @Column(name = "review_backlog_count_snapshot", nullable = false)
    private int reviewBacklogCountSnapshot;

    @Column(name = "approved_write_count", nullable = false)
    private int approvedWriteCount;

    @Column(name = "canonical_resolved_count", nullable = false)
    private int canonicalResolvedCount;

    @Column(name = "origin_filled_count", nullable = false)
    private int originFilledCount;

    @Column(name = "meaning_short_filled_count", nullable = false)
    private int meaningShortFilledCount;

    @Column(name = "meaning_long_filled_count", nullable = false)
    private int meaningLongFilledCount;

    @Column(name = "error_summary", columnDefinition = "TEXT")
    private String errorSummary;

    @Column(name = "triggered_by", length = 255)
    private String triggeredBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @jakarta.persistence.PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (status == null) {
            status = IngestionRunStatus.RUNNING;
        }
        if (startedAt == null) {
            startedAt = now;
        }
        if (triggerType == null) {
            triggerType = IngestionTriggerType.MANUAL;
        }
        createdAt = now;
        updatedAt = now;
    }

    @jakarta.persistence.PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
