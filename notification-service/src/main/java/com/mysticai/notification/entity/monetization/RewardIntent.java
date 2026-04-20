package com.mysticai.notification.entity.monetization;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tracks a single web rewarded-ad session from CTA click to token grant.
 * One intent per user-session; short-lived (default 5 min TTL).
 * Claim is idempotent: status CLAIMED + ledger idempotencyKey prevent double-grant.
 */
@Entity
@Table(
    name = "reward_intent",
    indexes = {
        @Index(name = "idx_ri_user_status",    columnList = "userId,status"),
        @Index(name = "idx_ri_user_created",   columnList = "userId,createdAt"),
        @Index(name = "idx_ri_idempotency",    columnList = "idempotencyKey", unique = true),
        @Index(name = "idx_ri_expires",        columnList = "expiresAt"),
        @Index(name = "idx_ri_ad_session",     columnList = "adSessionId")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RewardIntent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RewardIntentStatus status = RewardIntentStatus.PENDING;

    /** Platform source — always WEB_REWARDED_AD for this flow. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RewardClaimSource source = RewardClaimSource.WEB_REWARDED_AD;

    @Column(nullable = false)
    private int rewardAmount;

    /** e.g. "GURU_TOKEN" */
    @Column(nullable = false)
    private String rewardType;

    /** GAM ad unit path e.g. /12345/mysticai/rewarded */
    private String adUnitPath;

    /** Placement identifier for analytics grouping. */
    private String placementKey;

    /** GPT slot session id (clientEventId from browser). */
    private String adSessionId;

    /** Page URL context (normalized, no query params). */
    private String pageContext;

    /** SHA-256 hash of User-Agent; stored for anomaly detection, not PII. */
    private String userAgentHash;

    /** SHA-256 hash of client IP; stored for rate/fraud analysis, not PII. */
    private String ipHash;

    /**
     * Idempotency key written to GuruLedger on successful claim.
     * Format: "web_rewarded_ad_{intentId}_{userId}"
     */
    @Column(unique = true, nullable = false)
    private String idempotencyKey;

    /** Populated when status transitions to GRANTED. */
    private LocalDateTime grantedAt;

    /** Populated when status transitions to CLAIMED. */
    private LocalDateTime claimedAt;

    /** Populated on FAILED or CLOSED. */
    @Column(columnDefinition = "TEXT")
    private String failureReason;

    /** Short JSON snapshot of GPT reward payload (amount/type from event). */
    @Column(columnDefinition = "TEXT")
    private String grantedPayloadJson;

    /** Number of claim attempts; used for abuse detection. */
    @Builder.Default
    private int claimAttempts = 0;

    /**
     * SHA-256(intentId | adSessionId | clientEventId) from the first successful claim.
     *
     * WHY: Distinguishes safe idempotent retries from suspicious replay attempts.
     * - Same fingerprint on second claim → 200 idempotentReplay=true (network retry)
     * - Different fingerprint on second claim → 409 SESSION_CONFLICT (possible replay attack)
     *
     * Stored only after the first successful claim transition. Unique constraint enforced
     * at DB level (V002 migration) to prevent parallel race from storing two fingerprints.
     */
    @Column(length = 64)
    private String claimFingerprint;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @Version
    private Long version;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (idempotencyKey == null && id != null) {
            idempotencyKey = buildIdempotencyKey(id, userId);
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public boolean isExpired() {
        return expiresAt != null && LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean isClaimed() {
        return status == RewardIntentStatus.CLAIMED;
    }

    public boolean isTerminal() {
        return status == RewardIntentStatus.CLAIMED
            || status == RewardIntentStatus.CANCELLED
            || status == RewardIntentStatus.FAILED
            || status == RewardIntentStatus.EXPIRED;
    }

    public static String buildIdempotencyKey(UUID intentId, Long userId) {
        return "web_rewarded_ad_" + intentId + "_" + userId;
    }
}
