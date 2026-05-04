package com.mysticai.notification.service.billing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.notification.entity.monetization.PurchaseEvent;
import com.mysticai.notification.entity.monetization.SubscriptionEntitlement;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * Parses RevenueCat webhook JSON into the provider-neutral
 * {@link NormalizedPurchaseEvent}. RevenueCat field names vary across schema
 * versions, so the parser is intentionally tolerant: missing fields produce
 * a {@link NormalizedPurchaseEvent} with {@code parseFailureReason} set, which
 * the dispatch service records as a FAILED purchase event without crashing.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RevenueCatEventNormalizer {

    private final ObjectMapper objectMapper;

    public NormalizedPurchaseEvent normalize(String rawPayload) {
        JsonNode root;
        try {
            root = objectMapper.readTree(rawPayload);
        } catch (Exception e) {
            return parseFailure(rawPayload, "MALFORMED_JSON: " + e.getClass().getSimpleName());
        }

        JsonNode event = root.has("event") && root.get("event").isObject() ? root.get("event") : root;

        String eventTypeStr = textOrNull(event, "type");
        PurchaseEvent.EventType eventType = mapEventType(eventTypeStr);

        // Synthesize a stable id when RevenueCat omits one (rare but happens
        // for legacy event types) so the (provider, eventId) unique constraint
        // still drives idempotency.
        String eventId = textOrNull(event, "id");
        if (eventId == null || eventId.isBlank()) {
            String txn = textOrNull(event, "transaction_id");
            String type = eventTypeStr != null ? eventTypeStr : "UNKNOWN";
            eventId = (txn != null && !txn.isBlank())
                    ? "synth-" + type + "-" + txn
                    : "synth-" + type + "-" + UUID.randomUUID();
        }

        String appUserId = textOrNull(event, "app_user_id");
        Long userId = parseLongSafe(appUserId);

        String productId = textOrNull(event, "product_id");
        String transactionId = textOrNull(event, "transaction_id");
        String originalTransactionId = textOrNull(event, "original_transaction_id");
        String purchaseToken = textOrNull(event, "purchase_token");
        String storeStr = textOrNull(event, "store");
        SubscriptionEntitlement.Store store = mapStore(storeStr);
        String environment = textOrNull(event, "environment");
        String entitlementKey = extractEntitlementKey(event);

        LocalDateTime purchasedAt = epochMs(event, "purchased_at_ms");
        LocalDateTime expirationAt = epochMs(event, "expiration_at_ms");
        LocalDateTime trialStartAt = epochMs(event, "trial_start_at_ms");
        LocalDateTime trialEndAt = epochMs(event, "trial_end_at_ms");

        Boolean autoRenew = event.has("is_trial_period") && event.get("is_trial_period").asBoolean()
                ? Boolean.TRUE
                : (event.has("auto_resume_at_ms") || event.has("auto_renewing")
                        ? extractAutoRenew(event)
                        : null);

        BigDecimal price = event.has("price") && event.get("price").isNumber()
                ? new BigDecimal(event.get("price").asText())
                : null;
        String currency = textOrNull(event, "currency");

        boolean isRefund = eventType == PurchaseEvent.EventType.REFUND;
        boolean isRevocation = eventType == PurchaseEvent.EventType.REVOCATION;

        return new NormalizedPurchaseEvent(
                SubscriptionEntitlement.BillingProvider.REVENUECAT,
                store,
                eventId,
                eventType,
                userId,
                appUserId,
                productId,
                entitlementKey,
                transactionId,
                originalTransactionId,
                purchaseToken,
                environment,
                purchasedAt,
                expirationAt,
                trialStartAt,
                trialEndAt,
                autoRenew,
                price,
                currency,
                isRefund,
                isRevocation,
                rawPayload,
                null
        );
    }

    private NormalizedPurchaseEvent parseFailure(String rawPayload, String reason) {
        return new NormalizedPurchaseEvent(
                SubscriptionEntitlement.BillingProvider.REVENUECAT,
                null,
                "synth-malformed-" + UUID.randomUUID(),
                PurchaseEvent.EventType.IGNORED,
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null,
                false, false,
                rawPayload, reason
        );
    }

    private static String textOrNull(JsonNode node, String field) {
        if (node == null || !node.has(field) || node.get(field).isNull()) return null;
        String s = node.get(field).asText();
        return (s == null || s.isBlank()) ? null : s;
    }

    private static Long parseLongSafe(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return Long.parseLong(s.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static LocalDateTime epochMs(JsonNode node, String field) {
        if (node == null || !node.has(field) || node.get(field).isNull()) return null;
        long ms = node.get(field).asLong(0L);
        if (ms <= 0) return null;
        return LocalDateTime.ofEpochSecond(ms / 1000L, (int) ((ms % 1000L) * 1_000_000L), ZoneOffset.UTC);
    }

    private static Boolean extractAutoRenew(JsonNode node) {
        if (node.has("auto_renewing")) return node.get("auto_renewing").asBoolean();
        if (node.has("auto_resume_at_ms")) return !node.get("auto_resume_at_ms").isNull();
        return null;
    }

    private static String extractEntitlementKey(JsonNode event) {
        // RevenueCat ships entitlement_ids as an array; we use the first one
        // since our domain has a single "premium" entitlement today. When the
        // product lists multiple, the catalog row's entitlement_key wins later.
        if (event.has("entitlement_ids") && event.get("entitlement_ids").isArray()
                && event.get("entitlement_ids").size() > 0) {
            return event.get("entitlement_ids").get(0).asText();
        }
        return textOrNull(event, "entitlement_id");
    }

    private static SubscriptionEntitlement.Store mapStore(String storeStr) {
        if (storeStr == null) return null;
        return switch (storeStr.toUpperCase()) {
            case "APP_STORE", "MAC_APP_STORE" -> SubscriptionEntitlement.Store.APP_STORE;
            case "PLAY_STORE" -> SubscriptionEntitlement.Store.PLAY_STORE;
            case "STRIPE" -> SubscriptionEntitlement.Store.STRIPE;
            case "PROMOTIONAL" -> SubscriptionEntitlement.Store.PROMOTIONAL;
            default -> null;
        };
    }

    private static PurchaseEvent.EventType mapEventType(String revenueCatType) {
        if (revenueCatType == null) return PurchaseEvent.EventType.IGNORED;
        return switch (revenueCatType.toUpperCase()) {
            case "INITIAL_PURCHASE" -> PurchaseEvent.EventType.INITIAL_PURCHASE;
            case "RENEWAL" -> PurchaseEvent.EventType.RENEWAL;
            case "CANCELLATION" -> PurchaseEvent.EventType.CANCELLATION;
            case "UNCANCELLATION" -> PurchaseEvent.EventType.UNCANCELLATION;
            case "EXPIRATION" -> PurchaseEvent.EventType.EXPIRATION;
            case "BILLING_ISSUE" -> PurchaseEvent.EventType.BILLING_ISSUE;
            case "PRODUCT_CHANGE" -> PurchaseEvent.EventType.PRODUCT_CHANGE;
            case "NON_RENEWING_PURCHASE" -> PurchaseEvent.EventType.NON_RENEWING_PURCHASE;
            case "SUBSCRIPTION_PAUSED" -> PurchaseEvent.EventType.SUBSCRIPTION_PAUSED;
            case "REFUND", "SUBSCRIPTION_REFUND" -> PurchaseEvent.EventType.REFUND;
            case "REVOCATION" -> PurchaseEvent.EventType.REVOCATION;
            case "TRIAL_STARTED" -> PurchaseEvent.EventType.TRIAL_STARTED;
            case "TRIAL_CONVERTED" -> PurchaseEvent.EventType.TRIAL_CONVERTED;
            default -> PurchaseEvent.EventType.IGNORED;
        };
    }
}
