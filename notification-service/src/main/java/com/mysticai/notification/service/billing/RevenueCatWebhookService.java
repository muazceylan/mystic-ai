package com.mysticai.notification.service.billing;

import com.mysticai.notification.entity.monetization.GuruLedger;
import com.mysticai.notification.entity.monetization.GuruProductCatalog;
import com.mysticai.notification.entity.monetization.PurchaseEvent;
import com.mysticai.notification.entity.monetization.SubscriptionEntitlement;
import com.mysticai.notification.repository.GuruLedgerRepository;
import com.mysticai.notification.repository.GuruProductCatalogRepository;
import com.mysticai.notification.repository.PurchaseEventRepository;
import com.mysticai.notification.repository.SubscriptionEntitlementRepository;
import com.mysticai.notification.service.monetization.EntitlementService;
import com.mysticai.notification.service.monetization.GuruWalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Single dispatch service for RevenueCat webhook events.
 *
 * Pipeline:
 *   1. Normalize payload to {@link NormalizedPurchaseEvent}.
 *   2. Persist {@link PurchaseEvent} (provider+eventId unique → DB-level
 *      idempotency for the webhook).
 *   3. Subscription event → upsert {@link SubscriptionEntitlement}.
 *   4. Consumable event → credit {@link GuruLedger} via
 *      {@link GuruWalletService} with a deterministic idempotency key.
 *   5. Refund / revocation → reverse the consumable credit (subject to
 *      negative-balance guard) and update entitlement status.
 *   6. Update PurchaseEvent.processedStatus to PROCESSED / DUPLICATE / FAILED
 *      / IGNORED.
 *
 * Every business validation failure (missing user, unknown product, parse
 * failure, etc.) records the event with the failure reason but returns
 * {@link DispatchResult#PROCESSED}/{@code IGNORED}/{@code FAILED} so the
 * controller can answer 200 OK and let RevenueCat stop retrying.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RevenueCatWebhookService {

    private final RevenueCatEventNormalizer normalizer;
    private final RevenueCatWebhookProperties properties;
    private final PurchaseEventRepository purchaseEventRepository;
    private final SubscriptionEntitlementRepository entitlementRepository;
    private final GuruProductCatalogRepository productRepository;
    private final GuruLedgerRepository ledgerRepository;
    private final GuruWalletService walletService;
    private final EntitlementService entitlementService;

    public enum DispatchResult { PROCESSED, DUPLICATE, IGNORED, FAILED }

    /**
     * Process a raw RevenueCat webhook payload.
     *
     * @return {@link DispatchResult#DUPLICATE} when (provider, eventId) was
     *         already processed; otherwise PROCESSED / IGNORED / FAILED.
     */
    @Transactional
    public DispatchResult process(String rawPayload) {
        NormalizedPurchaseEvent event = normalizer.normalize(rawPayload);
        String truncatedRaw = truncate(rawPayload, properties.getMaxRawPayloadBytes());

        // Idempotency: identical (provider, eventId) seen before? Return early
        // without touching wallet / entitlement again.
        Optional<PurchaseEvent> existing = purchaseEventRepository
                .findByProviderAndEventId(event.provider(), event.eventId());
        if (existing.isPresent()) {
            log.info("RevenueCat webhook duplicate: provider={} eventId={} status={}",
                    event.provider(), event.eventId(), existing.get().getProcessedStatus());
            return DispatchResult.DUPLICATE;
        }

        PurchaseEvent purchaseEvent = PurchaseEvent.builder()
                .provider(event.provider())
                .store(event.store())
                .eventId(event.eventId())
                .eventType(event.eventType())
                .userId(event.userId())
                .productId(event.productId())
                .transactionId(event.transactionId())
                .originalTransactionId(event.originalTransactionId())
                .purchaseToken(event.purchaseToken())
                .rawPayload(truncatedRaw)
                .processedStatus(PurchaseEvent.ProcessedStatus.PENDING)
                .build();
        purchaseEvent = purchaseEventRepository.save(purchaseEvent);

        DispatchResult result;
        try {
            result = dispatch(purchaseEvent, event);
        } catch (RuntimeException e) {
            log.error("RevenueCat webhook handler crashed: eventId={} type={} reason={}",
                    event.eventId(), event.eventType(), e.getMessage(), e);
            purchaseEvent.setProcessedStatus(PurchaseEvent.ProcessedStatus.FAILED);
            purchaseEvent.setFailureReason("HANDLER_EXCEPTION: " + e.getClass().getSimpleName());
            purchaseEvent.setProcessedAt(LocalDateTime.now());
            purchaseEventRepository.save(purchaseEvent);
            // Re-raise so the transaction rolls back on transient infra errors;
            // the (provider, eventId) row was inserted in a separate save call
            // earlier — but since we are inside @Transactional, the rollback
            // will roll back the PurchaseEvent insert too, allowing retry.
            throw e;
        }

        purchaseEvent.setProcessedAt(LocalDateTime.now());
        purchaseEventRepository.save(purchaseEvent);
        return result;
    }

    /**
     * Dispatch to the right handler. Mutates {@code purchaseEvent} in place
     * (status, failureReason, ledgerEntryId, entitlementId, tokenAmountGranted).
     */
    private DispatchResult dispatch(PurchaseEvent purchaseEvent, NormalizedPurchaseEvent event) {
        if (event.isParseFailure()) {
            purchaseEvent.setProcessedStatus(PurchaseEvent.ProcessedStatus.IGNORED);
            purchaseEvent.setFailureReason("PARSE_FAILURE: " + event.parseFailureReason());
            return DispatchResult.IGNORED;
        }

        if (event.eventType() == PurchaseEvent.EventType.IGNORED) {
            purchaseEvent.setProcessedStatus(PurchaseEvent.ProcessedStatus.IGNORED);
            purchaseEvent.setFailureReason("UNKNOWN_EVENT_TYPE");
            return DispatchResult.IGNORED;
        }

        if (event.userId() == null) {
            purchaseEvent.setProcessedStatus(PurchaseEvent.ProcessedStatus.FAILED);
            purchaseEvent.setFailureReason(
                    event.appUserId() == null ? "MISSING_APP_USER_ID" : "UNRESOLVABLE_APP_USER_ID");
            return DispatchResult.FAILED;
        }

        return switch (event.eventType()) {
            case INITIAL_PURCHASE, RENEWAL, TRIAL_STARTED, TRIAL_CONVERTED,
                 UNCANCELLATION, PRODUCT_CHANGE -> handleSubscriptionActive(purchaseEvent, event);
            case CANCELLATION -> handleCancellation(purchaseEvent, event);
            case EXPIRATION -> handleExpiration(purchaseEvent, event);
            case BILLING_ISSUE -> handleBillingIssue(purchaseEvent, event);
            case SUBSCRIPTION_PAUSED -> handlePaused(purchaseEvent, event);
            case NON_RENEWING_PURCHASE -> handleConsumablePurchase(purchaseEvent, event);
            case REFUND -> handleRefund(purchaseEvent, event);
            case REVOCATION -> handleRevocation(purchaseEvent, event);
            default -> {
                purchaseEvent.setProcessedStatus(PurchaseEvent.ProcessedStatus.IGNORED);
                purchaseEvent.setFailureReason("UNHANDLED_EVENT_TYPE: " + event.eventType());
                yield DispatchResult.IGNORED;
            }
        };
    }

    // ─── Subscription handlers ────────────────────────────────────────

    private DispatchResult handleSubscriptionActive(PurchaseEvent purchaseEvent, NormalizedPurchaseEvent event) {
        SubscriptionEntitlement.Status target = (event.eventType() == PurchaseEvent.EventType.TRIAL_STARTED
                || (event.trialEndAt() != null && event.trialEndAt().isAfter(LocalDateTime.now())))
                ? SubscriptionEntitlement.Status.TRIALING
                : SubscriptionEntitlement.Status.ACTIVE;

        SubscriptionEntitlement entitlement = entitlementService.findOrCreateForWebhook(
                event.userId(),
                resolveEntitlementKey(event),
                event.provider(),
                event.originalTransactionId());

        SubscriptionEntitlement saved = entitlementService.applyAndSave(entitlement, event.purchasedAt(), e -> {
            e.setStatus(target);
            e.setStore(event.store());
            e.setProductId(event.productId());
            e.setOriginalTransactionId(event.originalTransactionId());
            e.setTransactionId(event.transactionId());
            e.setPurchaseToken(event.purchaseToken());
            e.setRevenueCatCustomerId(event.appUserId());
            if (event.purchasedAt() != null) e.setCurrentPeriodStartAt(event.purchasedAt());
            if (event.expirationAt() != null) e.setCurrentPeriodEndAt(event.expirationAt());
            if (event.trialStartAt() != null) e.setTrialStartAt(event.trialStartAt());
            if (event.trialEndAt() != null) e.setTrialEndAt(event.trialEndAt());
            if (event.autoRenewEnabled() != null) e.setAutoRenewEnabled(event.autoRenewEnabled());
            e.setCancelledAt(null);
            e.setExpiredAt(null);
            e.setRawPayload(truncate(event.rawPayload(), properties.getMaxRawPayloadBytes()));
        });

        purchaseEvent.setEntitlementId(saved.getId());
        purchaseEvent.setProcessedStatus(PurchaseEvent.ProcessedStatus.PROCESSED);
        purchaseEvent.setProductType(GuruProductCatalog.ProductType.SUBSCRIPTION);
        return DispatchResult.PROCESSED;
    }

    private DispatchResult handleCancellation(PurchaseEvent purchaseEvent, NormalizedPurchaseEvent event) {
        SubscriptionEntitlement entitlement = entitlementService.findOrCreateForWebhook(
                event.userId(), resolveEntitlementKey(event), event.provider(), event.originalTransactionId());

        // RevenueCat sends CANCELLATION when the user disables auto-renew —
        // they keep access until expirationAt. If expirationAt is missing or
        // already past we treat it as immediate EXPIRED.
        LocalDateTime periodEnd = event.expirationAt() != null
                ? event.expirationAt()
                : entitlement.getCurrentPeriodEndAt();
        boolean stillInPeriod = periodEnd != null && periodEnd.isAfter(LocalDateTime.now());
        SubscriptionEntitlement.Status target = stillInPeriod
                ? SubscriptionEntitlement.Status.CANCELLED_ACTIVE
                : SubscriptionEntitlement.Status.EXPIRED;

        SubscriptionEntitlement saved = entitlementService.applyAndSave(entitlement, event.purchasedAt(), e -> {
            e.setStatus(target);
            e.setAutoRenewEnabled(false);
            e.setCancelledAt(LocalDateTime.now());
            if (target == SubscriptionEntitlement.Status.EXPIRED) {
                e.setExpiredAt(LocalDateTime.now());
            }
            if (periodEnd != null) e.setCurrentPeriodEndAt(periodEnd);
        });

        purchaseEvent.setEntitlementId(saved.getId());
        purchaseEvent.setProcessedStatus(PurchaseEvent.ProcessedStatus.PROCESSED);
        return DispatchResult.PROCESSED;
    }

    private DispatchResult handleExpiration(PurchaseEvent purchaseEvent, NormalizedPurchaseEvent event) {
        return updateSubscriptionStatus(purchaseEvent, event, SubscriptionEntitlement.Status.EXPIRED, true);
    }

    private DispatchResult handleBillingIssue(PurchaseEvent purchaseEvent, NormalizedPurchaseEvent event) {
        return updateSubscriptionStatus(purchaseEvent, event, SubscriptionEntitlement.Status.BILLING_RETRY, false);
    }

    private DispatchResult handlePaused(PurchaseEvent purchaseEvent, NormalizedPurchaseEvent event) {
        return updateSubscriptionStatus(purchaseEvent, event, SubscriptionEntitlement.Status.PAUSED, false);
    }

    private DispatchResult handleRevocation(PurchaseEvent purchaseEvent, NormalizedPurchaseEvent event) {
        // Subscription revocation: also reverse any consumable credit if the
        // product was a token grant rather than a subscription.
        if (looksLikeConsumable(event)) {
            return reverseConsumable(purchaseEvent, event, /*revoke*/ true);
        }
        return updateSubscriptionStatus(purchaseEvent, event, SubscriptionEntitlement.Status.REVOKED, true);
    }

    private DispatchResult updateSubscriptionStatus(
            PurchaseEvent purchaseEvent,
            NormalizedPurchaseEvent event,
            SubscriptionEntitlement.Status target,
            boolean stampExpiredAt) {

        SubscriptionEntitlement entitlement = entitlementService.findOrCreateForWebhook(
                event.userId(), resolveEntitlementKey(event), event.provider(), event.originalTransactionId());

        SubscriptionEntitlement saved = entitlementService.applyAndSave(entitlement, event.purchasedAt(), e -> {
            e.setStatus(target);
            e.setAutoRenewEnabled(false);
            if (stampExpiredAt) e.setExpiredAt(LocalDateTime.now());
        });

        purchaseEvent.setEntitlementId(saved.getId());
        purchaseEvent.setProcessedStatus(PurchaseEvent.ProcessedStatus.PROCESSED);
        return DispatchResult.PROCESSED;
    }

    // ─── Consumable token handlers ────────────────────────────────────

    private DispatchResult handleConsumablePurchase(PurchaseEvent purchaseEvent, NormalizedPurchaseEvent event) {
        Optional<GuruProductCatalog> productOpt = lookupProduct(event);
        if (productOpt.isEmpty()) {
            purchaseEvent.setProcessedStatus(PurchaseEvent.ProcessedStatus.FAILED);
            purchaseEvent.setFailureReason("PRODUCT_NOT_FOUND: " + event.productId());
            return DispatchResult.FAILED;
        }

        GuruProductCatalog product = productOpt.get();
        purchaseEvent.setProductType(product.getProductType());

        int amount = product.getGuruAmount() + Math.max(0, product.getBonusGuruAmount());
        if (amount <= 0) {
            purchaseEvent.setProcessedStatus(PurchaseEvent.ProcessedStatus.FAILED);
            purchaseEvent.setFailureReason("INVALID_TOKEN_AMOUNT");
            return DispatchResult.FAILED;
        }

        String idempotencyKey = ledgerKeyFor(event);
        GuruLedger entry = walletService.grantGuru(
                event.userId(),
                amount,
                GuruLedger.TransactionType.PURCHASE_COMPLETED,
                GuruLedger.SourceType.PURCHASE_IAP,
                product.getProductKey(),
                null,
                null,
                event.store() != null ? event.store().name() : null,
                null,
                idempotencyKey,
                null
        );

        purchaseEvent.setLedgerEntryId(entry != null && entry.getId() != null ? entry.getId().toString() : null);
        purchaseEvent.setTokenAmountGranted(amount);
        purchaseEvent.setProcessedStatus(PurchaseEvent.ProcessedStatus.PROCESSED);
        return DispatchResult.PROCESSED;
    }

    private DispatchResult handleRefund(PurchaseEvent purchaseEvent, NormalizedPurchaseEvent event) {
        if (looksLikeConsumable(event)) {
            return reverseConsumable(purchaseEvent, event, /*revoke*/ false);
        }
        // Subscription refund: revoke premium access immediately.
        return updateSubscriptionStatus(purchaseEvent, event, SubscriptionEntitlement.Status.REFUNDED, true);
    }

    private DispatchResult reverseConsumable(PurchaseEvent purchaseEvent, NormalizedPurchaseEvent event, boolean revoke) {
        Optional<GuruProductCatalog> productOpt = lookupProduct(event);
        if (productOpt.isEmpty()) {
            purchaseEvent.setProcessedStatus(PurchaseEvent.ProcessedStatus.FAILED);
            purchaseEvent.setFailureReason("PRODUCT_NOT_FOUND_FOR_REVERSAL");
            return DispatchResult.FAILED;
        }

        GuruProductCatalog product = productOpt.get();
        int amount = product.getGuruAmount() + Math.max(0, product.getBonusGuruAmount());
        if (amount <= 0) {
            purchaseEvent.setProcessedStatus(PurchaseEvent.ProcessedStatus.FAILED);
            purchaseEvent.setFailureReason("INVALID_REVERSAL_AMOUNT");
            return DispatchResult.FAILED;
        }

        String reversalKey = (revoke ? "iap-revoke:" : "iap-refund:")
                + "REVENUECAT:"
                + (event.store() != null ? event.store().name() : "UNKNOWN")
                + ":" + (event.transactionId() != null ? event.transactionId() : "no-tx")
                + ":" + (event.productId() != null ? event.productId() : "no-product");

        // Production-safe policy (Phase 2 default): no negative balances.
        // If the user has spent the credited tokens already, mark the
        // reversal as PENDING_REVIEW for an admin to handle manually.
        int currentBalance = walletService.getBalance(event.userId());
        if (currentBalance < amount) {
            purchaseEvent.setProcessedStatus(PurchaseEvent.ProcessedStatus.FAILED);
            purchaseEvent.setFailureReason("INSUFFICIENT_BALANCE_FOR_REVERSAL: balance=" + currentBalance + " required=" + amount);
            log.warn("Refund/revocation reversal blocked by insufficient balance: userId={} txId={} balance={} required={}",
                    event.userId(), event.transactionId(), currentBalance, amount);
            return DispatchResult.FAILED;
        }

        GuruLedger entry = walletService.grantGuru(
                event.userId(),
                -amount,
                GuruLedger.TransactionType.REFUND_ADJUSTMENT,
                GuruLedger.SourceType.PURCHASE_REFUND_REVERSAL,
                product.getProductKey(),
                null,
                null,
                event.store() != null ? event.store().name() : null,
                null,
                reversalKey,
                null
        );

        purchaseEvent.setLedgerEntryId(entry != null && entry.getId() != null ? entry.getId().toString() : null);
        purchaseEvent.setTokenAmountGranted(-amount);
        purchaseEvent.setProcessedStatus(PurchaseEvent.ProcessedStatus.PROCESSED);
        return DispatchResult.PROCESSED;
    }

    // ─── Helpers ──────────────────────────────────────────────────────

    private Optional<GuruProductCatalog> lookupProduct(NormalizedPurchaseEvent event) {
        if (event.productId() == null) return Optional.empty();
        // Try the explicit RevenueCat-mapped lookup first; fall back to store
        // ids and finally productKey, since admins commonly populate only one.
        Optional<GuruProductCatalog> byProductKey = productRepository.findByProductKey(event.productId());
        if (byProductKey.isPresent()) return byProductKey;
        return productRepository.findAll().stream()
                .filter(p -> event.productId().equals(p.getRevenueCatProductId())
                        || event.productId().equals(p.getIosProductId())
                        || event.productId().equals(p.getAndroidProductId()))
                .findFirst();
    }

    private String resolveEntitlementKey(NormalizedPurchaseEvent event) {
        if (event.entitlementKey() != null && !event.entitlementKey().isBlank()) {
            return event.entitlementKey();
        }
        return lookupProduct(event)
                .map(GuruProductCatalog::getEntitlementKey)
                .filter(s -> s != null && !s.isBlank())
                .orElse(EntitlementService.DEFAULT_ENTITLEMENT_KEY);
    }

    private static String ledgerKeyFor(NormalizedPurchaseEvent event) {
        return "iap:REVENUECAT:"
                + (event.store() != null ? event.store().name() : "UNKNOWN")
                + ":" + (event.transactionId() != null ? event.transactionId() : event.eventId())
                + ":" + (event.productId() != null ? event.productId() : "no-product");
    }

    private static boolean looksLikeConsumable(NormalizedPurchaseEvent event) {
        // Refund / revocation events don't always tell us upfront whether the
        // refunded purchase was a consumable or a subscription; we infer from
        // the original event row when present, otherwise fall back to product
        // type lookup at handler time. For now: anything with a transactionId
        // but no expirationAt is treated as consumable.
        return event.expirationAt() == null && event.transactionId() != null;
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }

    /**
     * Validate an incoming Authorization header against the configured
     * webhook secret. Public so the controller can call before persisting
     * anything; returns true if the secret is correct or if we are in
     * explicit allow-empty-secret mode.
     */
    public boolean isAuthorized(String authorizationHeader) {
        String secret = properties.getSecret();
        if ((secret == null || secret.isBlank())) {
            if (properties.isAllowEmptySecret()) {
                log.warn("RevenueCat webhook accepted without secret — allow-empty-secret=true (dev only)");
                return true;
            }
            log.error("RevenueCat webhook rejected: secret is not configured");
            return false;
        }
        if (authorizationHeader == null) return false;
        String expected = "Bearer " + secret;
        // Constant-time comparison to avoid timing leaks.
        if (authorizationHeader.length() != expected.length()) return false;
        int diff = 0;
        for (int i = 0; i < expected.length(); i++) {
            diff |= authorizationHeader.charAt(i) ^ expected.charAt(i);
        }
        return diff == 0;
    }
}
