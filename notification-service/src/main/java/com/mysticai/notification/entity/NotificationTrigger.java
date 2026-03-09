package com.mysticai.notification.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Trigger Registry — represents a concrete scheduler job or event-based trigger.
 * Static backend triggers are seeded on startup by TriggerRegistrar and updated on each run.
 * Runtime monitoring fields (lastRunAt, lastRunStatus, lastProducedCount) are updated
 * by the scheduler wrappers after each execution.
 */
@Entity
@Table(name = "notification_triggers")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationTrigger {

    public enum SourceType { STATIC_BACKEND, ADMIN_SCHEDULED }

    public enum CadenceType { HOURLY, DAILY, WEEKLY, EVENT_DRIVEN, MANUAL }

    public enum RunStatus { SUCCESS, FAILED, SKIPPED, DISABLED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 120)
    private String triggerKey;

    /** Links to NotificationDefinition.definitionKey (optional for maintenance jobs). */
    @Column(length = 120)
    private String definitionKey;

    @Column(nullable = false, length = 200)
    private String displayName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SourceType sourceType = SourceType.STATIC_BACKEND;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CadenceType cadenceType = CadenceType.DAILY;

    /** Cron expression (e.g. "0 30 8 * * *") — null for fixedDelay triggers. */
    @Column(length = 100)
    private String cronExpression;

    /** Fixed delay in milliseconds — null for cron triggers. */
    private Long fixedDelayMs;

    @Column(length = 60)
    @Builder.Default
    private String timezone = "Europe/Istanbul";

    /** Whether this trigger is active and will execute on schedule. */
    @Column(nullable = false)
    @Builder.Default
    @JsonProperty("isActive")
    private boolean isActive = true;

    /** Whether this trigger can be paused from the admin panel. */
    @Column(nullable = false)
    @Builder.Default
    @JsonProperty("isPausable")
    private boolean isPausable = true;

    /** System-critical triggers cannot be disabled from the admin panel. */
    @Column(nullable = false)
    @Builder.Default
    @JsonProperty("isSystemCritical")
    private boolean isSystemCritical = false;

    // ── Runtime monitoring fields ──────────────────────────────────────────

    private LocalDateTime lastRunAt;

    private LocalDateTime nextRunAt;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private RunStatus lastRunStatus;

    /** Truncated error/info message from the last run. */
    @Column(length = 500)
    private String lastRunMessage;

    /** Number of notifications produced in the last run. */
    private Integer lastProducedCount;

    @Column(length = 100)
    private String ownerModule;

    /** Java class#method reference for traceability. */
    @Column(length = 300)
    private String codeReference;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
