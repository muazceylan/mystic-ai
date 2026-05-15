package com.mysticai.notification.service.monetization;

import com.mysticai.notification.entity.monetization.GuruProductCatalog;
import com.mysticai.notification.entity.monetization.GuruWallet;
import com.mysticai.notification.entity.monetization.MonetizationSettings;
import com.mysticai.notification.entity.monetization.SubscriptionEntitlement;
import com.mysticai.notification.repository.GuruProductCatalogRepository;
import com.mysticai.notification.repository.GuruWalletRepository;
import com.mysticai.notification.repository.MonetizationSettingsRepository;
import com.mysticai.notification.repository.SubscriptionEntitlementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Phase 1 BillingService skeleton.
 *
 * Owns the read side of the paywall: pulls active settings, splits the
 * GuruProductCatalog into subscription vs token products, and joins the
 * caller's wallet + entitlement state into a single response the mobile
 * paywall screen can render in one round-trip.
 *
 * Purchase validation, RevenueCat sync and webhook handling are out of
 * scope for Phase 1 — those land in Phase 2 / Phase 3.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BillingService {

    private final MonetizationSettingsRepository settingsRepository;
    private final GuruProductCatalogRepository productRepository;
    private final GuruWalletRepository walletRepository;
    private final SubscriptionEntitlementRepository entitlementRepository;
    private final EntitlementService entitlementService;

    @Transactional(readOnly = true)
    public PaywallResponse getPaywall(Long userId) {
        MonetizationSettings settings = activeSettings();

        if (settings == null) {
            return PaywallResponse.disabled();
        }

        EntitlementService.EntitlementSnapshot snapshot = entitlementService.getSnapshot(userId);
        boolean trialEligible = entitlementService.isTrialEligible(userId, EntitlementService.DEFAULT_ENTITLEMENT_KEY);

        List<GuruProductCatalog> catalog = settings.isPremiumEnabled() || settings.isTokenPurchaseEnabled()
                ? productRepository
                .findAllByIsEnabledTrueAndRolloutStatusOrderBySortOrderAsc(GuruProductCatalog.RolloutStatus.ENABLED)
                : List.of();

        List<SubscriptionProductResponse> subscriptionProducts = catalog.stream()
                .filter(p -> p.getProductType() == GuruProductCatalog.ProductType.SUBSCRIPTION)
                .filter(p -> settings.isPremiumEnabled())
                .sorted(Comparator.comparingInt(GuruProductCatalog::getSortOrder))
                .map(SubscriptionProductResponse::from)
                .toList();

        List<TokenProductResponse> tokenProducts = catalog.stream()
                .filter(p -> p.getProductType() == GuruProductCatalog.ProductType.CONSUMABLE
                        || p.getProductType() == GuruProductCatalog.ProductType.BUNDLE
                        || p.getProductType() == GuruProductCatalog.ProductType.PROMOTIONAL)
                .filter(p -> settings.isTokenPurchaseEnabled() || settings.isGuruPurchaseEnabled())
                .sorted(Comparator.comparingInt(GuruProductCatalog::getSortOrder))
                .map(TokenProductResponse::from)
                .toList();

        int walletBalance = userId != null
                ? walletRepository.findByUserId(userId).map(GuruWallet::getCurrentBalance).orElse(0)
                : 0;

        return new PaywallResponse(
                settings.isPremiumEnabled(),
                settings.isTrialEnabled(),
                trialEligible && !snapshot.premiumActive(),
                settings.getDefaultTrialDays(),
                settings.isTokenPurchaseEnabled(),
                settings.isRevenueCatEnabled(),
                settings.isHideAdsForPremiumUsers(),
                settings.isAllowPremiumAndTokenTogether(),
                snapshot.premiumActive(),
                snapshot.trialing(),
                snapshot.status(),
                snapshot.trialEndAt(),
                snapshot.currentPeriodEndAt(),
                walletBalance,
                subscriptionProducts,
                tokenProducts,
                List.of(),
                LocalDateTime.now()
        );
    }

    private MonetizationSettings activeSettings() {
        return settingsRepository
                .findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED)
                .orElse(null);
    }

    /**
     * Mobile-side sync is observational only. The client may tell us which
     * RevenueCat customer / product identifiers it sees, but access state
     * remains server-authoritative and is still driven by verified webhooks.
     */
    @Transactional
    public MobileBillingStateResponse syncRevenueCat(Long userId, RevenueCatSyncRequest request) {
        if (userId == null) {
            return MobileBillingStateResponse.empty();
        }
        observeMobileBillingState(
                userId,
                request != null ? request.appUserId() : null,
                request != null ? request.activeEntitlements() : null,
                request != null ? request.activeProductIds() : null,
                request != null ? request.environment() : null,
                "sync");

        return MobileBillingStateResponse.from(entitlementService.getSnapshot(userId));
    }

    @Transactional
    public MobileBillingStateResponse restorePurchases(Long userId, RestorePurchasesRequest request) {
        observeMobileBillingState(
                userId,
                request != null ? request.appUserId() : null,
                request != null ? request.activeEntitlements() : null,
                request != null ? request.activeProductIds() : null,
                request != null ? request.environment() : null,
                "restore");
        return userId == null
                ? MobileBillingStateResponse.empty()
                : MobileBillingStateResponse.from(entitlementService.getSnapshot(userId));
    }

    private void observeMobileBillingState(
            Long userId,
            String appUserId,
            List<String> activeEntitlements,
            List<String> activeProductIds,
            String environment,
            String source) {
        if (userId == null) {
            return;
        }

        Optional<SubscriptionEntitlement> entitlementOpt = entitlementRepository
                .findFirstByUserIdAndEntitlementKeyOrderByUpdatedAtDesc(
                        userId,
                        EntitlementService.DEFAULT_ENTITLEMENT_KEY);

        if (entitlementOpt.isPresent()) {
            SubscriptionEntitlement entitlement = entitlementOpt.get();
            boolean mutated = false;

            if (appUserId != null
                    && !appUserId.isBlank()
                    && !appUserId.equals(entitlement.getRevenueCatCustomerId())) {
                entitlement.setRevenueCatCustomerId(appUserId);
                mutated = true;
            }

            if ((entitlement.getProductId() == null || entitlement.getProductId().isBlank())
                    && activeProductIds != null
                    && activeProductIds.size() == 1) {
                entitlement.setProductId(activeProductIds.get(0));
                mutated = true;
            }

            if (mutated) {
                entitlementRepository.save(entitlement);
            }
        }

        log.info("RevenueCat mobile {} observed: userId={} activeEntitlements={} activeProducts={} environment={}",
                source,
                userId,
                activeEntitlements != null ? activeEntitlements.size() : 0,
                activeProductIds != null ? activeProductIds.size() : 0,
                environment);
    }

    // ─── Response records ──────────────────────────────────────────────

    public record PaywallResponse(
            boolean premiumEnabled,
            boolean trialEnabled,
            boolean trialEligible,
            int defaultTrialDays,
            boolean tokenPurchaseEnabled,
            boolean revenueCatEnabled,
            boolean hideAdsForPremiumUsers,
            boolean allowPremiumAndTokenTogether,
            boolean premiumActive,
            boolean trialing,
            String entitlementStatus,
            LocalDateTime trialEndsAt,
            LocalDateTime currentPeriodEndsAt,
            int tokenBalance,
            List<SubscriptionProductResponse> subscriptionProducts,
            List<TokenProductResponse> tokenProducts,
            List<String> benefits,
            LocalDateTime fetchedAt
    ) {
        public static PaywallResponse disabled() {
            return new PaywallResponse(
                    false, false, false, 0,
                    false, false, false, true,
                    false, false, "NONE",
                    null, null,
                    0,
                    List.of(), List.of(), List.of(),
                    LocalDateTime.now()
            );
        }
    }

    public record SubscriptionProductResponse(
            String productKey,
            String iosProductId,
            String androidProductId,
            String revenueCatProductId,
            String title,
            String description,
            String entitlementKey,
            String price,
            String currency,
            int trialDurationDays,
            int sortOrder,
            String badge,
            String campaignLabel
    ) {
        public static SubscriptionProductResponse from(GuruProductCatalog p) {
            return new SubscriptionProductResponse(
                    p.getProductKey(),
                    p.getIosProductId(),
                    p.getAndroidProductId(),
                    p.getRevenueCatProductId(),
                    p.getTitle(),
                    p.getDescription(),
                    p.getEntitlementKey(),
                    p.getPrice() != null ? p.getPrice().toPlainString() : null,
                    p.getCurrency(),
                    p.getTrialDurationDays(),
                    p.getSortOrder(),
                    p.getBadge(),
                    p.getCampaignLabel()
            );
        }
    }

    public record TokenProductResponse(
            String productKey,
            String productType,
            String iosProductId,
            String androidProductId,
            String revenueCatProductId,
            String title,
            String description,
            int tokenAmount,
            int bonusTokenAmount,
            String price,
            String currency,
            int sortOrder,
            String badge,
            String campaignLabel
    ) {
        public static TokenProductResponse from(GuruProductCatalog p) {
            return new TokenProductResponse(
                    p.getProductKey(),
                    p.getProductType().name(),
                    p.getIosProductId(),
                    p.getAndroidProductId(),
                    p.getRevenueCatProductId(),
                    p.getTitle(),
                    p.getDescription(),
                    p.getGuruAmount(),
                    p.getBonusGuruAmount(),
                    p.getPrice() != null ? p.getPrice().toPlainString() : null,
                    p.getCurrency(),
                    p.getSortOrder(),
                    p.getBadge(),
                    p.getCampaignLabel()
            );
        }
    }

    public record RevenueCatSyncRequest(
            String appUserId,
            String originalAppUserId,
            List<String> activeEntitlements,
            List<String> activeProductIds,
            String environment,
            String fetchedAt,
            String purchaseIdempotencyKey,
            String purchasedProductId,
            String storeTransactionId
    ) {}

    public record RestorePurchasesRequest(
            String appUserId,
            List<String> activeEntitlements,
            List<String> activeProductIds,
            String environment,
            String restoredAt
    ) {}

    public record MobileBillingStateResponse(
            boolean premiumActive,
            boolean trialing,
            String status,
            int tokenBalance,
            List<String> entitlements
    ) {
        public static MobileBillingStateResponse empty() {
            return new MobileBillingStateResponse(false, false, "NONE", 0, List.of());
        }

        public static MobileBillingStateResponse from(EntitlementService.EntitlementSnapshot snapshot) {
            return new MobileBillingStateResponse(
                    snapshot.premiumActive(),
                    snapshot.trialing(),
                    snapshot.status(),
                    snapshot.tokenBalance(),
                    snapshot.entitlements()
            );
        }
    }
}
