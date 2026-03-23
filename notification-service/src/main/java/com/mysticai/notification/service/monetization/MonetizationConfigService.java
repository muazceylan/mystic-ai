package com.mysticai.notification.service.monetization;

import com.mysticai.notification.entity.monetization.*;
import com.mysticai.notification.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Public-facing config service for mobile clients.
 * Returns the active (PUBLISHED) monetization configuration.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MonetizationConfigService {

    private final MonetizationSettingsRepository settingsRepository;
    private final ModuleMonetizationRuleRepository ruleRepository;
    private final MonetizationActionRepository actionRepository;
    private final GuruProductCatalogRepository productRepository;
    private final GuruWalletRepository walletRepository;

    @Transactional(readOnly = true)
    public MonetizationConfigResponse getActiveConfig(Long userId) {
        MonetizationSettings settings = settingsRepository
                .findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED)
                .orElse(null);

        if (settings == null || !settings.isEnabled()) {
            return MonetizationConfigResponse.disabled();
        }

        int activeVersion = settings.getConfigVersion();

        List<ModuleMonetizationRule> rules = ruleRepository
                .findAllByIsEnabledTrueAndConfigVersion(activeVersion);

        List<MonetizationAction> actions = actionRepository
                .findAllByIsEnabledTrueOrderByModuleKeyAscDisplayPriorityAsc();

        List<GuruProductCatalog> products = settings.isGuruPurchaseEnabled()
                ? productRepository.findAllByIsEnabledTrueAndRolloutStatusOrderBySortOrderAsc(
                GuruProductCatalog.RolloutStatus.ENABLED)
                : List.of();

        int walletBalance = userId != null
                ? walletRepository.findByUserId(userId)
                .map(w -> w.getCurrentBalance())
                .orElse(0)
                : 0;

        return new MonetizationConfigResponse(
                true,
                settings.isAdsEnabled(),
                settings.isGuruEnabled(),
                settings.isGuruPurchaseEnabled(),
                settings.getDefaultAdProvider(),
                settings.getGlobalDailyAdCap(),
                settings.getGlobalWeeklyAdCap(),
                settings.getGlobalMinHoursBetweenOffers(),
                settings.getGlobalMinSessionsBetweenOffers(),
                activeVersion,
                rules.stream().map(ModuleRuleResponse::from).toList(),
                actions.stream().map(ActionResponse::from).toList(),
                products.stream().map(ProductResponse::from).toList(),
                walletBalance,
                LocalDateTime.now()
        );
    }

    @Transactional(readOnly = true)
    public ModuleRuleResponse getModuleRule(String moduleKey) {
        MonetizationSettings settings = settingsRepository
                .findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED)
                .orElse(null);

        if (settings == null) return null;

        return ruleRepository
                .findByModuleKeyAndConfigVersion(moduleKey, settings.getConfigVersion())
                .map(ModuleRuleResponse::from)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public EligibilityCheckResponse checkActionEligibility(Long userId, String moduleKey,
                                                             String actionKey, int entryCount) {
        MonetizationSettings settings = settingsRepository
                .findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED)
                .orElse(null);

        if (settings == null || !settings.isEnabled()) {
            return new EligibilityCheckResponse(false, false, false, false, "monetization_disabled", 0, 0);
        }

        MonetizationAction action = actionRepository
                .findByActionKeyAndModuleKey(actionKey, moduleKey)
                .orElse(null);

        if (action == null || !action.isEnabled()) {
            return new EligibilityCheckResponse(true, false, false, false, "action_not_found", 0, 0);
        }

        ModuleMonetizationRule rule = ruleRepository
                .findByModuleKeyAndConfigVersion(moduleKey, settings.getConfigVersion())
                .orElse(null);

        boolean adEligible = rule != null && rule.isAdsEnabled() && settings.isAdsEnabled()
                && entryCount >= rule.getAdOfferStartEntry();

        boolean guruUnlockAvailable = rule != null && rule.isGuruEnabled() && settings.isGuruEnabled();

        boolean purchaseFallback = rule != null && rule.isGuruPurchaseEnabled()
                && settings.isGuruPurchaseEnabled();

        int walletBalance = walletRepository.findByUserId(userId)
                .map(w -> w.getCurrentBalance())
                .orElse(0);

        boolean canAfford = walletBalance >= action.getGuruCost();

        String reason = null;
        if (!adEligible && !canAfford && !purchaseFallback) {
            reason = "no_unlock_path_available";
        } else if (entryCount < (rule != null ? rule.getFirstNEntriesWithoutAd() : 1)) {
            reason = "within_free_entries";
            adEligible = false;
        }

        return new EligibilityCheckResponse(
                true, adEligible, guruUnlockAvailable && canAfford,
                purchaseFallback, reason, walletBalance, action.getGuruCost()
        );
    }

    // ─── Response Records ──────────────────────────────────────────────

    public record MonetizationConfigResponse(
            boolean enabled,
            boolean adsEnabled,
            boolean guruEnabled,
            boolean guruPurchaseEnabled,
            String defaultAdProvider,
            int globalDailyAdCap,
            int globalWeeklyAdCap,
            int globalMinHoursBetweenOffers,
            int globalMinSessionsBetweenOffers,
            int configVersion,
            List<ModuleRuleResponse> moduleRules,
            List<ActionResponse> actions,
            List<ProductResponse> products,
            int walletBalance,
            LocalDateTime fetchedAt
    ) {
        public static MonetizationConfigResponse disabled() {
            return new MonetizationConfigResponse(
                    false, false, false, false, null,
                    0, 0, 0, 0, 0,
                    List.of(), List.of(), List.of(), 0,
                    LocalDateTime.now()
            );
        }
    }

    public record ModuleRuleResponse(
            String moduleKey,
            boolean enabled,
            boolean adsEnabled,
            boolean guruEnabled,
            boolean guruPurchaseEnabled,
            String adStrategy,
            String adProvider,
            String adFormats,
            int firstNEntriesWithoutAd,
            int adOfferStartEntry,
            String adOfferFrequencyMode,
            int minimumSessionsBetweenOffers,
            int minimumHoursBetweenOffers,
            int dailyOfferCap,
            int weeklyOfferCap,
            boolean onlyUserTriggeredOffer,
            boolean showOfferOnDetailClick,
            boolean showOfferOnSecondEntry,
            int guruRewardAmountPerCompletedAd,
            boolean allowFreePreview,
            String previewDepthMode,
            String rolloutStatus
    ) {
        public static ModuleRuleResponse from(ModuleMonetizationRule r) {
            return new ModuleRuleResponse(
                    r.getModuleKey(),
                    r.isEnabled(),
                    r.isAdsEnabled(),
                    r.isGuruEnabled(),
                    r.isGuruPurchaseEnabled(),
                    r.getAdStrategy().name(),
                    r.getAdProvider(),
                    r.getAdFormats(),
                    r.getFirstNEntriesWithoutAd(),
                    r.getAdOfferStartEntry(),
                    r.getAdOfferFrequencyMode().name(),
                    r.getMinimumSessionsBetweenOffers(),
                    r.getMinimumHoursBetweenOffers(),
                    r.getDailyOfferCap(),
                    r.getWeeklyOfferCap(),
                    r.isOnlyUserTriggeredOffer(),
                    r.isShowOfferOnDetailClick(),
                    r.isShowOfferOnSecondEntry(),
                    r.getGuruRewardAmountPerCompletedAd(),
                    r.isAllowFreePreview(),
                    r.getPreviewDepthMode().name(),
                    r.getRolloutStatus().name()
            );
        }
    }

    public record ActionResponse(
            String actionKey,
            String moduleKey,
            String displayName,
            String unlockType,
            int guruCost,
            int rewardAmount,
            boolean adRequired,
            boolean purchaseRequired,
            boolean previewAllowed,
            int displayPriority
    ) {
        public static ActionResponse from(MonetizationAction a) {
            return new ActionResponse(
                    a.getActionKey(),
                    a.getModuleKey(),
                    a.getDisplayName(),
                    a.getUnlockType().name(),
                    a.getGuruCost(),
                    a.getRewardAmount(),
                    a.isAdRequired(),
                    a.isPurchaseRequired(),
                    a.isPreviewAllowed(),
                    a.getDisplayPriority()
            );
        }
    }

    public record ProductResponse(
            String productKey,
            String productType,
            String title,
            String description,
            int guruAmount,
            int bonusGuruAmount,
            String price,
            String currency,
            String iosProductId,
            String androidProductId,
            int sortOrder,
            String badge,
            String campaignLabel
    ) {
        public static ProductResponse from(GuruProductCatalog p) {
            return new ProductResponse(
                    p.getProductKey(),
                    p.getProductType().name(),
                    p.getTitle(),
                    p.getDescription(),
                    p.getGuruAmount(),
                    p.getBonusGuruAmount(),
                    p.getPrice() != null ? p.getPrice().toPlainString() : null,
                    p.getCurrency(),
                    p.getIosProductId(),
                    p.getAndroidProductId(),
                    p.getSortOrder(),
                    p.getBadge(),
                    p.getCampaignLabel()
            );
        }
    }

    public record EligibilityCheckResponse(
            boolean monetizationActive,
            boolean adOfferEligible,
            boolean guruUnlockAvailable,
            boolean purchaseFallbackAvailable,
            String reason,
            int walletBalance,
            int requiredGuruCost
    ) {}
}
