package com.mysticai.notification.entity.monetization;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Subscription / trial entitlement state for a single user.
 *
 * Phase 1 (foundation only): the entity, repository and snapshot endpoint exist
 * but no purchase / webhook flow writes to it yet. Default state for every user
 * is "no row" → empty entitlement snapshot.
 *
 * One active row per (userId, entitlementKey). Lifecycle is driven by the
 * billing provider webhook (Phase 2). The `provider` + `originalTransactionId`
 * pair is the stable handle across renewals.
 */
@Entity
@Table(name = "subscription_entitlement",
        indexes = {
                @Index(name = "idx_subent_user", columnList = "userId"),
                @Index(name = "idx_subent_user_entitlement", columnList = "userId,entitlementKey"),
                @Index(name = "idx_subent_status", columnList = "status"),
                @Index(name = "idx_subent_period_end", columnList = "currentPeriodEndAt"),
                @Index(name = "idx_subent_original_tx", columnList = "originalTransactionId")
        })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionEntitlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    /** Entitlement key the rest of the system gates on. */
    @Column(nullable = false)
    private String entitlementKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BillingProvider provider = BillingProvider.REVENUECAT;

    /** Concrete store the purchase came from. */
    @Enumerated(EnumType.STRING)
    private Store store;

    /** Store product id (matches GuruProductCatalog.iosProductId / androidProductId). */
    private String productId;

    /** RevenueCat customer id when known, used to correlate webhooks → user. */
    private String revenueCatCustomerId;

    /** Stable transaction id across renewals (Apple originalTransactionId / Google purchaseToken anchor). */
    private String originalTransactionId;

    /** Latest concrete transaction id (changes on each renewal). */
    private String transactionId;

    /** Google Play purchase token for the latest transaction. */
    @Column(columnDefinition = "TEXT")
    private String purchaseToken;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.EXPIRED;

    private LocalDateTime trialStartAt;
    private LocalDateTime trialEndAt;

    private LocalDateTime currentPeriodStartAt;
    private LocalDateTime currentPeriodEndAt;

    @Builder.Default
    private boolean autoRenewEnabled = false;

    private LocalDateTime cancelledAt;
    private LocalDateTime expiredAt;

    /** Last time we received a billing event that touched this row. */
    private LocalDateTime lastEventAt;

    /** Most recent raw provider payload (truncated/redacted), kept for support / debugging. */
    @Column(columnDefinition = "TEXT")
    private String rawPayload;

    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Version
    private Long version;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Premium gate truth.
     *
     * - ACTIVE / TRIALING / GRACE_PERIOD always grant access.
     * - CANCELLED_ACTIVE only grants access while currentPeriodEndAt is in the
     *   future — Apple/Google do NOT cut access immediately when the user
     *   cancels mid-period; we honour the paid period.
     * - REFUNDED, REVOKED, EXPIRED, PAUSED, BILLING_RETRY block access. (For
     *   billing retry we are conservative; can be promoted to grace later.)
     */
    public boolean isActive() {
        if (status == Status.ACTIVE || status == Status.TRIALING || status == Status.GRACE_PERIOD) {
            return true;
        }
        if (status == Status.CANCELLED_ACTIVE) {
            return currentPeriodEndAt != null && currentPeriodEndAt.isAfter(LocalDateTime.now());
        }
        return false;
    }

    public boolean isTrialing() {
        return status == Status.TRIALING;
    }

    public enum Status {
        TRIALING,
        ACTIVE,
        GRACE_PERIOD,
        BILLING_RETRY,
        PAUSED,
        CANCELLED_ACTIVE,
        EXPIRED,
        REFUNDED,
        REVOKED
    }

    public enum BillingProvider {
        REVENUECAT,
        APPLE_DIRECT,
        GOOGLE_DIRECT,
        ADMIN_GRANT
    }

    public enum Store {
        APP_STORE,
        PLAY_STORE,
        STRIPE,
        PROMOTIONAL,
        ADMIN
    }
}
