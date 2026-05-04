package com.mysticai.notification.service.billing;

import com.mysticai.notification.entity.monetization.PurchaseEvent;
import com.mysticai.notification.entity.monetization.SubscriptionEntitlement;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Provider-neutral view of a billing event. Webhook handlers depend on this
 * shape, never on the raw RevenueCat payload, so we can add Apple direct /
 * Google direct providers later without touching the dispatch logic.
 */
public record NormalizedPurchaseEvent(
        SubscriptionEntitlement.BillingProvider provider,
        SubscriptionEntitlement.Store store,
        String eventId,
        PurchaseEvent.EventType eventType,
        Long userId,
        String appUserId,
        String productId,
        String entitlementKey,
        String transactionId,
        String originalTransactionId,
        String purchaseToken,
        String environment,
        LocalDateTime purchasedAt,
        LocalDateTime expirationAt,
        LocalDateTime trialStartAt,
        LocalDateTime trialEndAt,
        Boolean autoRenewEnabled,
        BigDecimal price,
        String currency,
        boolean isRefund,
        boolean isRevocation,
        String rawPayload,
        String parseFailureReason
) {
    /** True if the normalizer could not extract enough data to dispatch. */
    public boolean isParseFailure() {
        return parseFailureReason != null;
    }

    /** True if this event mutates a subscription's lifecycle. */
    public boolean isSubscriptionEvent() {
        return switch (eventType) {
            case INITIAL_PURCHASE, RENEWAL, CANCELLATION, UNCANCELLATION,
                 EXPIRATION, BILLING_ISSUE, PRODUCT_CHANGE, SUBSCRIPTION_PAUSED,
                 TRIAL_STARTED, TRIAL_CONVERTED -> true;
            // Refund / revocation can target either a subscription or a
            // consumable; we look at the original event before normalisation.
            case REFUND, REVOCATION -> !isRefund || !"NON_RENEWING_PURCHASE".equals(productId);
            default -> false;
        };
    }
}
