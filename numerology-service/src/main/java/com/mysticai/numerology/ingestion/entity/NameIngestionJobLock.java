package com.mysticai.numerology.ingestion.entity;

import com.mysticai.numerology.ingestion.model.IngestionJobLockStatus;
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
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "name_ingestion_job_locks", uniqueConstraints = {
        @UniqueConstraint(name = "uq_name_ingestion_job_locks_source_name", columnNames = "source_name")
}, indexes = {
        @Index(name = "idx_name_ingestion_job_locks_status", columnList = "status"),
        @Index(name = "idx_name_ingestion_job_locks_source_status", columnList = "source_name,status"),
        @Index(name = "idx_name_ingestion_job_locks_heartbeat", columnList = "heartbeat_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NameIngestionJobLock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_name", nullable = false, length = 64)
    private SourceName sourceName;

    @Column(name = "lock_key", length = 128)
    private String lockKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 24)
    private IngestionJobLockStatus status;

    @Column(name = "owner_instance_id", length = 255)
    private String ownerInstanceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", length = 24)
    private IngestionTriggerType triggerType;

    @Column(name = "job_run_id")
    private Long jobRunId;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "heartbeat_at")
    private LocalDateTime heartbeatAt;

    @Column(name = "released_at")
    private LocalDateTime releasedAt;

    @Column(name = "release_reason", columnDefinition = "TEXT")
    private String releaseReason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @jakarta.persistence.PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (status == null) {
            status = IngestionJobLockStatus.RELEASED;
        }
        createdAt = now;
        updatedAt = now;
    }

    @jakarta.persistence.PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
