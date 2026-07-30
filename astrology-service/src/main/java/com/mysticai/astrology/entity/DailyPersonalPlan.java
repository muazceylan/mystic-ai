package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * One generated personal plan for a user's LOCAL calendar day.
 *
 * {@code localDate} is the day as the user experiences it in {@code timezone} — never the
 * server day and never the UTC day. A partial unique index guarantees at most one ACTIVE plan
 * per (user, localDate, locale); rebuilds mark the previous row REPLACED rather than deleting
 * it, so the history window used for duplicate suppression stays intact.
 */
@Entity
@Table(
        name = "daily_personal_plans",
        indexes = {
                @Index(name = "idx_daily_personal_plan_user_local_date", columnList = "user_id,local_date"),
                @Index(name = "idx_daily_personal_plan_history", columnList = "user_id,locale,local_date,status"),
                @Index(name = "idx_daily_personal_plan_created_at", columnList = "created_at")
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyPersonalPlan {

    public enum Status {
        /** The plan currently served for this local day. At most one per user/date/locale. */
        ACTIVE,
        /** Superseded by a regeneration; retained for cross-day duplicate suppression. */
        REPLACED,
        /** Composition failed after invalidation; kept for diagnostics. */
        FAILED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** The user's local calendar day. */
    @Column(name = "local_date", nullable = false)
    private LocalDate localDate;

    /** IANA zone the local day was resolved in; part of the plan identity. */
    @Column(name = "timezone", nullable = false, length = 64)
    private String timezone;

    @Column(name = "locale", nullable = false, length = 8)
    private String locale;

    /** Composer + catalog version; a change invalidates stored plans without a migration. */
    @Column(name = "algorithm_version", nullable = false, length = 32)
    private String algorithmVersion;

    /** 1 for the first plan of the local day, incremented on each feedback-driven rebuild. */
    @Column(name = "generation_number", nullable = false)
    private int generationNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private Status status;

    /** Chart/profile signature; regenerates when the user's birth data or status changes. */
    @Column(name = "context_hash", nullable = false, length = 64)
    private String contextHash;

    @Column(name = "payload_json", nullable = false, columnDefinition = "TEXT")
    private String payloadJson;

    /** Comma-separated {@code sk:}/{@code ai:} keys for cross-day repetition checks. */
    @Column(name = "fingerprints", length = 2048)
    private String fingerprints;

    /** Newline-separated headline sentences, compared semantically against new candidates. */
    @Column(name = "highlight_texts", columnDefinition = "TEXT")
    private String highlightTexts;

    /**
     * Deduplicates repeated submissions of the same feedback. Set when a plan is created by a
     * regeneration; a retry carrying the same key returns the existing plan instead of
     * building another one.
     */
    @Column(name = "regeneration_request_key", length = 128)
    private String regenerationRequestKey;

    @Version
    @Column(name = "version")
    private Long version;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        if (status == null) {
            status = Status.ACTIVE;
        }
        if (generationNumber <= 0) {
            generationNumber = 1;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
