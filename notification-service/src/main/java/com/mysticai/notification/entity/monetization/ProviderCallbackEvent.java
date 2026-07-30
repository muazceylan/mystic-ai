package com.mysticai.notification.entity.monetization;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Immutable audit + idempotency record of a single provider reward callback
 * (e.g. an ayeT rewarded-video server-to-server postback).
 *
 * IDEMPOTENCY ANCHOR: the {@code (provider, providerTransactionId)} pair is unique.
 * A second callback with the same transaction id can never grant a second token —
 * the unique constraint rejects the duplicate insert, and the handler answers 200 OK.
 *
 * {@code payoutUsd} is stored purely for revenue/analytics reporting; it never
 * influences how many tokens are granted.
 */
@Entity
@Table(
    name = "provider_callback_event",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_pce_provider_txn", columnNames = {"provider", "providerTransactionId"})
    },
    indexes = {
        @Index(name = "idx_pce_user",    columnList = "userId"),
        @Index(name = "idx_pce_session", columnList = "rewardSessionId"),
        @Index(name = "idx_pce_status",  columnList = "status"),
        @Index(name = "idx_pce_received", columnList = "receivedAt")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderCallbackEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RewardProvider provider;

    @Column(nullable = false)
    private String providerTransactionId;

    /** Resolved reward recipient; null when the callback failed session resolution. */
    private Long userId;

    /** The reward session (external_identifier) this callback referenced, if resolvable. */
    private UUID rewardSessionId;

    private String adslotId;
    private String placementIdentifier;

    /** currency_amount reported by the provider (validated, not trusted for grant size). */
    private Integer currencyAmount;

    /** payout_usd reported by the provider — revenue reporting only. */
    @Column(precision = 12, scale = 6)
    private BigDecimal payoutUsd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CallbackStatus status;

    /** For REJECTED events: short machine code explaining why (no PII). */
    private String rejectionReason;

    /** SHA-256 of the normalized callback parameters — dedupe/forensics, not PII. */
    @Column(length = 64)
    private String rawPayloadHash;

    /** Guru Tokens actually granted by this callback (0 for duplicate/rejected). */
    @Builder.Default
    private int grantedAmount = 0;

    /** Reference to the GuruLedger entry written when this callback credited tokens. */
    private String ledgerEntryId;

    @Column(updatable = false, nullable = false)
    private LocalDateTime receivedAt;

    private LocalDateTime processedAt;

    @PrePersist
    protected void onCreate() {
        if (receivedAt == null) receivedAt = LocalDateTime.now();
    }

    public enum CallbackStatus {
        /** Token granted for the first time. */
        PROCESSED,
        /** Same transaction id seen again — no re-grant. */
        DUPLICATE,
        /** Failed validation (bad placement/adslot/currency/session). */
        REJECTED
    }
}
