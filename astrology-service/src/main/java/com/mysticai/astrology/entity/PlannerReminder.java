package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "planner_reminders",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_planner_reminder_dedupe",
                        columnNames = {"user_id", "type", "payload_hash", "date_time_utc"}
                )
        },
        indexes = {
                @Index(name = "idx_planner_reminders_user_date", columnList = "user_id, reminder_date"),
                @Index(name = "idx_planner_reminders_status_due", columnList = "status, enabled, next_attempt_utc")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlannerReminder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "reminder_date", nullable = false)
    private LocalDate reminderDate;

    @Column(name = "date_time_utc", nullable = false)
    private LocalDateTime dateTimeUtc;

    @Column(name = "local_time", nullable = false, length = 5)
    private String localTime;

    @Column(name = "timezone", nullable = false, length = 64)
    private String timezone;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 24)
    private ReminderType type;

    @Column(name = "payload_json", columnDefinition = "TEXT")
    private String payloadJson;

    @Column(name = "payload_hash", nullable = false, length = 64)
    private String payloadHash;

    @Column(name = "message_title", nullable = false, length = 120)
    private String messageTitle;

    @Column(name = "message_body", nullable = false, length = 240)
    private String messageBody;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 24)
    private ReminderStatus status;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;

    @Column(name = "last_error", length = 240)
    private String lastError;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "next_attempt_utc", nullable = false)
    private LocalDateTime nextAttemptUtc;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (status == null) status = ReminderStatus.SCHEDULED;
        if (!enabled) enabled = true;
        if (nextAttemptUtc == null) nextAttemptUtc = dateTimeUtc;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
