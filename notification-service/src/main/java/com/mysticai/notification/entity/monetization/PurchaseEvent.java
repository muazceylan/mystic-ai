package com.mysticai.notification.entity.monetization;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Immutable log of purchase / billing events delivered by an external billing
 * provider (RevenueCat webhook, Apple/Google direct, admin grant).
 *
 * Phase 1: entity + repository only — no webhook writes here yet. Webhook
 * processing in Phase 2 will use (provider, eventId) as the idempotency anchor.
 */
@Entity
@Table(name = "purchase_event",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_pe_provider_event", columnNames = {"provider", "eventId"})
        },
        indexes = {
                @Index(name = "idx_pe_user", columnList = "userId"),
                @Index(name = "idx_pe_provider", columnList = "provider"),
                @Index(name = "idx_pe_event_type", columnList = "eventType"),
                @Index(name = "idx_pe_processed", columnList = "processedStatus"),
                @Index(name = "idx_pe_product", columnList = "productId"),
                @Index(name = "idx_pe_original_tx", columnList = "originalTransactionId")
        })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Nullable for webhook events that arrive before user resolution. */
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionEntitlement.BillingProvider provider;

    @Enumerated(EnumType.STRING)
    private SubscriptionEntitlement.Store store;

    /** Provider-supplied event id; the (provider, eventId) pair is unique. */
    @Column(nullable = false)
    private String eventId;

    private String transactionId;
    private String originalTransactionId;

    @Column(columnDefinition = "TEXT")
    private String purchaseToken;

    private String productId;

    @Enumerated(EnumType.STRING)
    private GuruProductCatalog.ProductType productType;

    /**
     * Provider event type, normalized to a small enum.
     * Unknown event types from the webhook are stored as IGNORED.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventType eventType;

    /** When the event represents a token purchase, the granted token amount. */
    private Integer tokenAmountGranted;

    /** Reference to the GuruLedger entry written when this event credited tokens. */
    private String ledgerEntryId;

    /** Reference to the SubscriptionEntitlement row touched by this event. */
    private Long entitlementId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ProcessedStatus processedStatus = ProcessedStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String failureReason;

    /** Raw provider payload (truncated to a sane size by the webhook handler). */
    @Column(columnDefinition = "TEXT")
    private String rawPayload;

    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;
    private LocalDateTime processedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum EventType {
        INITIAL_PURCHASE,
        RENEWAL,
        CANCELLATION,
        UNCANCELLATION,
        EXPIRATION,
        BILLING_ISSUE,
        PRODUCT_CHANGE,
        NON_RENEWING_PURCHASE,
        SUBSCRIPTION_PAUSED,
        REFUND,
        REVOCATION,
        TRIAL_STARTED,
        TRIAL_CONVERTED,
        ADMIN_GRANT,
        ADMIN_REVOKE,
        IGNORED
    }

    public enum ProcessedStatus {
        PENDING,
        PROCESSED,
        DUPLICATE,
        FAILED,
        IGNORED
    }
}
