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
                .isSignupBonusEnabled(true)
                .signupBonusTokenAmount(10)
                .signupBonusLedgerReason("SIGNUP_BONUS")
                .isSignupBonusOneTimeOnly(true)
                .signupBonusHelperText("Yeni uyeler icin tek seferlik hos geldin Guru bakiyesi")
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
        seedRule("share_cards", 12, 1, 3, 15);
        seedRule("natal_chart", 12, 1, 3, 15);
        seedRule("horoscope", 12, 1, 3, 15);
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

    // ─── Actions (pilot actions) ────────────────────────────────────

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

        seedAction("dream_interpret", "dreams", "Rüya Yorumu",
                "Rüya girişiniz için yapay zeka yorumunu başlatın",
                MonetizationAction.UnlockType.AD_OR_GURU, 1);

        seedFeatureAction("shareable_card_create", "share_cards", "Paylaşılabilir kart oluştur",
                "Kartı oluşturmak için 1 Guru Token kullanın. Yetersiz bakiye varsa video izleyerek kazanabilirsiniz.",
                "Paylaşılabilir kartını aç", "Video izle, Guru kazan", "SHAREABLE_CARD_CREATE");
        seedFeatureAction("natal_chart_detail_view", "natal_chart", "Harita detay section'larını aç",
                "Haritanın detay section'larını görüntülemek için 1 Guru Token kullanın.",
                "1 Guru Token ile aç", "Video izle, Guru kazan", "NATAL_CHART_DETAIL_VIEW");
        seedFeatureAction("compatibility_view", "compatibility", "Uyumluluk sonucunu göster",
                "Uyumluluk sonucunu görüntülemek için 1 Guru Token kullanın.",
                "1 Guru Token ile aç", "Video izle, Guru kazan", "COMPATIBILITY_VIEW");
        seedFeatureAction("person_add", "compatibility", "Kişi ekle",
                "Yeni kişi eklemek için 1 Guru Token kullanın.",
                "1 Guru Token ile ekle", "Video izle, Guru kazan", "PERSON_ADD");
        seedFeatureAction("birth_night_poster_view", "natal_chart", "Doğduğun gece posterini gör",
                "Poster atölyesini açmak için 1 Guru Token kullanın.",
                "1 Guru Token ile aç", "Video izle, Guru kazan", "BIRTH_NIGHT_POSTER_VIEW");
        seedFeatureAction("horoscope_view", "horoscope", "Burç yorumunu gör",
                "Burç yorumunu görüntülemek için 1 Guru Token kullanın.",
                "1 Guru Token ile aç", "Video izle, Guru kazan", "HOROSCOPE_VIEW");
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

    private void seedFeatureAction(String actionKey,
                                   String moduleKey,
                                   String displayName,
                                   String description,
                                   String primaryCtaLabel,
                                   String secondaryCtaLabel,
                                   String analyticsKey) {
        if (actionRepository.existsByActionKeyAndModuleKey(actionKey, moduleKey)) {
            log.debug("[MonetizationBootstrap] Feature action '{}/{}' already exists, skipping", moduleKey, actionKey);
            return;
        }

        MonetizationAction action = MonetizationAction.builder()
                .actionKey(actionKey)
                .moduleKey(moduleKey)
                .displayName(displayName)
                .description(description)
                .dialogTitle(displayName)
                .dialogDescription(description)
                .primaryCtaLabel(primaryCtaLabel)
                .secondaryCtaLabel(secondaryCtaLabel)
                .analyticsKey(analyticsKey)
                .unlockType(MonetizationAction.UnlockType.GURU_SPEND)
                .guruCost(1)
                .rewardAmount(1)
                .isRewardFallbackEnabled(true)
                .isAdRequired(false)
                .isPurchaseRequired(false)
                .isPreviewAllowed(true)
                .isEnabled(true)
                .displayPriority(10)
                .createdByAdminId(0L)
                .build();

        actionRepository.save(action);
        log.info("[MonetizationBootstrap] Created feature action '{}/{}'", moduleKey, actionKey);
    }
}
