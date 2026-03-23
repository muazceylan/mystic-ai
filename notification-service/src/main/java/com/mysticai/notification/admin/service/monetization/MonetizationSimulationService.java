package com.mysticai.notification.admin.service.monetization;

import com.mysticai.notification.entity.monetization.ModuleMonetizationRule;
import com.mysticai.notification.entity.monetization.MonetizationAction;
import com.mysticai.notification.entity.monetization.MonetizationSettings;
import com.mysticai.notification.repository.ModuleMonetizationRuleRepository;
import com.mysticai.notification.repository.MonetizationActionRepository;
import com.mysticai.notification.repository.MonetizationSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MonetizationSimulationService {

    private final MonetizationSettingsRepository settingsRepository;
    private final ModuleMonetizationRuleRepository ruleRepository;
    private final MonetizationActionRepository actionRepository;

    @Transactional(readOnly = true)
    public SimulationResult simulate(SimulationRequest request) {
        List<String> decisions = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        MonetizationSettings settings = settingsRepository
                .findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED)
                .orElse(null);

        if (settings == null || !settings.isEnabled()) {
            decisions.add("MONETIZATION_DISABLED: No active published config");
            return new SimulationResult(false, false, false, false, decisions, warnings);
        }

        ModuleMonetizationRule rule = ruleRepository
                .findByModuleKeyAndConfigVersion(request.moduleKey(), settings.getConfigVersion())
                .orElse(null);

        if (rule == null || !rule.isEnabled()) {
            decisions.add("MODULE_DISABLED: No active rule for module " + request.moduleKey());
            return new SimulationResult(false, false, false, false, decisions, warnings);
        }

        // Ad eligibility check
        boolean adEligible = false;
        if (rule.isAdsEnabled() && settings.isAdsEnabled()) {
            if (request.entryCount() < rule.getFirstNEntriesWithoutAd()) {
                decisions.add("AD_SKIPPED: Entry " + request.entryCount() +
                        " is within free entries (first " + rule.getFirstNEntriesWithoutAd() + ")");
            } else if (request.entryCount() < rule.getAdOfferStartEntry()) {
                decisions.add("AD_SKIPPED: Entry " + request.entryCount() +
                        " has not reached offer start entry (" + rule.getAdOfferStartEntry() + ")");
            } else if (request.dailyAdCount() >= rule.getDailyOfferCap()) {
                decisions.add("AD_CAPPED: Daily cap reached (" + rule.getDailyOfferCap() + ")");
            } else if (request.weeklyAdCount() >= rule.getWeeklyOfferCap()) {
                decisions.add("AD_CAPPED: Weekly cap reached (" + rule.getWeeklyOfferCap() + ")");
            } else if (request.hoursSinceLastOffer() < rule.getMinimumHoursBetweenOffers()) {
                decisions.add("AD_COOLDOWN: Only " + request.hoursSinceLastOffer() +
                        "h since last offer (min " + rule.getMinimumHoursBetweenOffers() + "h)");
            } else {
                adEligible = true;
                decisions.add("AD_ELIGIBLE: Rewarded ad can be offered");
                decisions.add("  Reward: " + rule.getGuruRewardAmountPerCompletedAd() + " Guru");
            }
        } else {
            decisions.add("ADS_DISABLED: Ads not enabled for this module");
        }

        // Guru unlock check
        boolean guruUnlockAvailable = false;
        MonetizationAction action = null;
        if (request.actionKey() != null) {
            action = actionRepository
                    .findByActionKeyAndModuleKey(request.actionKey(), request.moduleKey())
                    .orElse(null);
        }

        if (action != null && action.isEnabled() && rule.isGuruEnabled() && settings.isGuruEnabled()) {
            if (request.walletBalance() >= action.getGuruCost()) {
                guruUnlockAvailable = true;
                decisions.add("GURU_UNLOCK_AVAILABLE: Can spend " + action.getGuruCost() +
                        " Guru (balance: " + request.walletBalance() + ")");
            } else {
                decisions.add("GURU_INSUFFICIENT: Need " + action.getGuruCost() +
                        " Guru, have " + request.walletBalance());
            }
        } else if (action == null && request.actionKey() != null) {
            warnings.add("Action not found: " + request.actionKey());
        }

        // Purchase fallback check
        boolean purchaseFallback = rule.isGuruPurchaseEnabled() && settings.isGuruPurchaseEnabled();
        if (purchaseFallback) {
            decisions.add("PURCHASE_FALLBACK_AVAILABLE: User can purchase Guru");
        }

        // Preview check
        if (rule.isAllowFreePreview()) {
            decisions.add("PREVIEW_ALLOWED: Mode=" + rule.getPreviewDepthMode());
        }

        return new SimulationResult(true, adEligible, guruUnlockAvailable, purchaseFallback, decisions, warnings);
    }

    public record SimulationRequest(
            String moduleKey,
            String actionKey,
            int entryCount,
            int dailyAdCount,
            int weeklyAdCount,
            double hoursSinceLastOffer,
            int walletBalance,
            String platform,
            String locale
    ) {}

    public record SimulationResult(
            boolean monetizationActive,
            boolean adOfferEligible,
            boolean guruUnlockAvailable,
            boolean purchaseFallbackAvailable,
            List<String> decisions,
            List<String> warnings
    ) {}
}
