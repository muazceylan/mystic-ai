package com.mysticai.notification.service.billing;

/**
 * Shared idempotency key builders for billing flows.
 *
 * The RevenueCat webhook and the mobile sync endpoint both credit the
 * wallet for the same store transaction. They MUST produce the same
 * GuruLedger.idempotency_key so that whichever arrives first credits and
 * the other is blocked by the unique constraint on the ledger.
 */
public final class BillingIdempotencyKeys {

    private BillingIdempotencyKeys() {}

    public static String forConsumablePurchase(String storeName, String transactionId, String productId) {
        return "iap:REVENUECAT:"
                + safe(storeName, "UNKNOWN")
                + ":" + safe(transactionId, "no-tx")
                + ":" + safe(productId, "no-product");
    }

    private static String safe(String value, String fallback) {
        return value != null && !value.isBlank() ? value : fallback;
    }
}
