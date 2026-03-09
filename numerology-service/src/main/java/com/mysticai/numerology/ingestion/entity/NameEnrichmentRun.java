package com.mysticai.numerology.ingestion.entity;

import com.mysticai.numerology.ingestion.model.NameEnrichmentRunStatus;
import com.mysticai.numerology.ingestion.model.NameEnrichmentTriggerType;
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
@Table(name = "name_enrichment_runs", indexes = {
        @Index(name = "idx_name_enrichment_runs_started_at", columnList = "started_at"),
        @Index(name = "idx_name_enrichment_runs_status", columnList = "status"),
        @Index(name = "idx_name_enrichment_runs_trigger_type", columnList = "trigger_type")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NameEnrichmentRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", nullable = false, length = 24)
    private NameEnrichmentTriggerType triggerType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 24)
    private NameEnrichmentRunStatus status;

    @Column(name = "enrichment_version", nullable = false, length = 32)
    private String enrichmentVersion;

    @Column(name = "processed_count", nullable = false)
    private int processedCount;

    @Column(name = "updated_count", nullable = false)
    private int updatedCount;

    @Column(name = "skipped_count", nullable = false)
    private int skippedCount;

    @Column(name = "low_confidence_count", nullable = false)
    private int lowConfidenceCount;

    @Column(name = "error_count", nullable = false)
    private int errorCount;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

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
            status = NameEnrichmentRunStatus.RUNNING;
        }
        if (startedAt == null) {
            startedAt = now;
        }
        createdAt = now;
        updatedAt = now;
    }

    @jakarta.persistence.PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
