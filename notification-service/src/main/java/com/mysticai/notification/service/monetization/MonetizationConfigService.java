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
    private final FeatureAccessService featureAccessService;
    private final WebRewardedAdsEligibilityResolver webRewardedAdsEligibilityResolver;

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
                webRewardedAdsEligibilityResolver.isWebRewardedAdsEnabled(settings),
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
        FeatureAccessService.FeatureAccessResponse access = featureAccessService.evaluateAccess(userId, moduleKey, actionKey);
        return new EligibilityCheckResponse(
                access.monetizationActive(),
                access.rewardedAdAvailable(),
                access.guruUnlockAvailable() && access.currentBalance() >= access.tokenCost(),
                access.purchaseFallbackAvailable(),
                access.message(),
                access.currentBalance(),
                access.tokenCost(),
                access.allowed(),
                access.requiresToken(),
                access.rewardTokenAmount(),
                access.featureKey(),
                access.status(),
                access.actionType(),
                access.dialogTitle(),
                access.dialogDescription(),
                access.primaryCtaLabel(),
                access.secondaryCtaLabel(),
                access.analyticsKey(),
                access.dailyLimit(),
                access.weeklyLimit(),
                access.dailyUsageCount(),
                access.weeklyUsageCount()
        );
    }

    // ─── Response Records ──────────────────────────────────────────────

    public record MonetizationConfigResponse(
            boolean enabled,
            boolean adsEnabled,
            boolean webAdsEnabled,
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
                    false, false, false, false, false, null,
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
            String description,
            String dialogTitle,
            String dialogDescription,
            String unlockType,
            int guruCost,
            int rewardAmount,
            boolean rewardFallbackEnabled,
            boolean adRequired,
            boolean purchaseRequired,
            boolean previewAllowed,
            int displayPriority,
            int dailyLimit,
            int weeklyLimit,
            String primaryCtaLabel,
            String secondaryCtaLabel,
            String analyticsKey,
            Long updatedByAdminId,
            LocalDateTime updatedAt
    ) {
        public static ActionResponse from(MonetizationAction a) {
            return new ActionResponse(
                    a.getActionKey(),
                    a.getModuleKey(),
                    a.getDisplayName(),
                    a.getDescription(),
                    a.getDialogTitle(),
                    a.getDialogDescription(),
                    a.getUnlockType().name(),
                    a.getGuruCost(),
                    a.getRewardAmount(),
                    a.isRewardFallbackEnabled(),
                    a.isAdRequired(),
                    a.isPurchaseRequired(),
                    a.isPreviewAllowed(),
                    a.getDisplayPriority(),
                    a.getDailyLimit(),
                    a.getWeeklyLimit(),
                    a.getPrimaryCtaLabel(),
                    a.getSecondaryCtaLabel(),
                    a.getAnalyticsKey(),
                    a.getUpdatedByAdminId(),
                    a.getUpdatedAt()
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
            int requiredGuruCost,
            boolean allowed,
            boolean requiresToken,
            int rewardTokenAmount,
            String featureKey,
            String status,
            String actionType,
            String dialogTitle,
            String dialogDescription,
            String primaryCtaLabel,
            String secondaryCtaLabel,
            String analyticsKey,
            int dailyLimit,
            int weeklyLimit,
            long dailyUsageCount,
            long weeklyUsageCount
    ) {}
}
