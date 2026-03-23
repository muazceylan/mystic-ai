package com.mysticai.notification.config;

import com.mysticai.notification.entity.monetization.*;
import com.mysticai.notification.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Idempotent seed for pilot monetization configuration.
 * Creates PUBLISHED settings, module rules, and actions if they don't exist.
 * Safe to run on every startup — skips existing records.
 *
 * Pilot modules: numerology, compatibility, dreams
 * Phase 1: Ads + Guru enabled, Purchase disabled
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MonetizationBootstrapService implements ApplicationRunner {

    private static final String PILOT_SETTINGS_KEY = "pilot_v1";
    private static final int PILOT_CONFIG_VERSION = 1;

    private final MonetizationSettingsRepository settingsRepository;
    private final ModuleMonetizationRuleRepository ruleRepository;
    private final MonetizationActionRepository actionRepository;

    @Override
    public void run(ApplicationArguments args) {
        seedSettings();
        seedModuleRules();
        seedActions();
    }

    // ─── Global Settings ────────────────────────────────────────────

    private void seedSettings() {
        if (settingsRepository.existsBySettingsKey(PILOT_SETTINGS_KEY)) {
            log.debug("[MonetizationBootstrap] Settings '{}' already exists, skipping", PILOT_SETTINGS_KEY);
            return;
        }

        MonetizationSettings settings = MonetizationSettings.builder()
                .settingsKey(PILOT_SETTINGS_KEY)
                .isEnabled(true)
                .isAdsEnabled(true)
                .isGuruEnabled(true)
                .isGuruPurchaseEnabled(false)    // Phase 1: purchase disabled
                .defaultAdProvider("admob")
                .defaultCurrency("TRY")
                .globalDailyAdCap(10)
                .globalWeeklyAdCap(50)
                .globalMinHoursBetweenOffers(1)
                .globalMinSessionsBetweenOffers(1)
                .status(MonetizationSettings.Status.PUBLISHED)
                .configVersion(PILOT_CONFIG_VERSION)
                .publishedByAdminId(0L)          // system seed
                .build();

        settingsRepository.save(settings);
        log.info("[MonetizationBootstrap] Created PUBLISHED settings '{}'", PILOT_SETTINGS_KEY);
    }

    // ─── Module Rules (3 pilot modules) ─────────────────────────────

    private void seedModuleRules() {
        seedRule("numerology", 12, 2, 3, 15);
        seedRule("compatibility", 12, 2, 3, 15);
        seedRule("dreams", 12, 2, 3, 15);
    }

    private void seedRule(String moduleKey, int cooldownHours, int startEntry, int dailyCap, int weeklyCap) {
        if (ruleRepository.existsByModuleKeyAndConfigVersion(moduleKey, PILOT_CONFIG_VERSION)) {
            log.debug("[MonetizationBootstrap] Rule '{}/v{}' already exists, skipping", moduleKey, PILOT_CONFIG_VERSION);
            return;
        }

        ModuleMonetizationRule rule = ModuleMonetizationRule.builder()
                .moduleKey(moduleKey)
                .isEnabled(true)
                .isAdsEnabled(true)
                .isGuruEnabled(true)
                .isGuruPurchaseEnabled(false)
                .adStrategy(ModuleMonetizationRule.AdStrategy.ON_CTA_CLICK)
                .adProvider("admob")
                .adFormats("rewarded")
                .firstNEntriesWithoutAd(1)
                .adOfferStartEntry(startEntry)
                .adOfferFrequencyMode(ModuleMonetizationRule.AdOfferFrequencyMode.COMBINED)
                .minimumSessionsBetweenOffers(1)
                .minimumHoursBetweenOffers(cooldownHours)
                .dailyOfferCap(dailyCap)
                .weeklyOfferCap(weeklyCap)
                .isOnlyUserTriggeredOffer(false)
                .isShowOfferOnDetailClick(false)
                .isShowOfferOnSecondEntry(true)
                .guruRewardAmountPerCompletedAd(1)
                .isAllowFreePreview(true)
                .previewDepthMode(ModuleMonetizationRule.PreviewDepthMode.SUMMARY_ONLY)
                .rolloutStatus(ModuleMonetizationRule.RolloutStatus.ENABLED)
                .configVersion(PILOT_CONFIG_VERSION)
                .createdByAdminId(0L)
                .build();

        ruleRepository.save(rule);
        log.info("[MonetizationBootstrap] Created module rule '{}/v{}'", moduleKey, PILOT_CONFIG_VERSION);
    }

    // ─── Actions (3 pilot actions) ──────────────────────────────────

    private void seedActions() {
        seedAction("advanced_analysis", "numerology", "Detaylı Numeroloji Analizi",
                "Numeroloji hesabınızın ileri düzey yorumlarını açın",
                MonetizationAction.UnlockType.AD_OR_GURU, 2);

        seedAction("ai_compare", "compatibility", "AI Uyumluluk Analizi",
                "İki kişi arasındaki detaylı uyumluluk yorumunu açın",
                MonetizationAction.UnlockType.AD_OR_GURU, 2);

        seedAction("monthly_dream_story", "dreams", "Aylık Rüya Hikayesi",
                "Aylık rüya özetinizi ve analiz hikayenizi oluşturun",
                MonetizationAction.UnlockType.AD_OR_GURU, 3);
    }

    private void seedAction(String actionKey, String moduleKey, String displayName,
                            String description, MonetizationAction.UnlockType unlockType, int guruCost) {
        if (actionRepository.existsByActionKeyAndModuleKey(actionKey, moduleKey)) {
            log.debug("[MonetizationBootstrap] Action '{}/{}' already exists, skipping", moduleKey, actionKey);
            return;
        }

        MonetizationAction action = MonetizationAction.builder()
                .actionKey(actionKey)
                .moduleKey(moduleKey)
                .displayName(displayName)
                .description(description)
                .unlockType(unlockType)
                .guruCost(guruCost)
                .rewardAmount(0)
                .isAdRequired(false)
                .isPurchaseRequired(false)
                .isPreviewAllowed(true)
                .isEnabled(true)
                .displayPriority(0)
                .createdByAdminId(0L)
                .build();

        actionRepository.save(action);
        log.info("[MonetizationBootstrap] Created action '{}/{}'", moduleKey, actionKey);
    }
}
