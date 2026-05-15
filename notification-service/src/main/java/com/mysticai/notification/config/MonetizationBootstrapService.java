package com.mysticai.notification.config;

import com.mysticai.notification.entity.monetization.*;
import com.mysticai.notification.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Idempotent seed for pilot monetization configuration.
 * Creates or upgrades the bootstrap monetization config, module rules, guru
 * products and actions.
 * Safe to run on every startup — skips existing records.
 *
 * Pilot modules: numerology, compatibility, dreams
 * Phase 5 baseline: premium + token purchase catalog visible by default, while
 * the final store availability is still governed by RevenueCat readiness.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MonetizationBootstrapService implements ApplicationRunner {

    private static final String PILOT_SETTINGS_KEY = "pilot_v1";
    private static final int PILOT_CONFIG_VERSION = 1;

    private final MonetizationSettingsRepository settingsRepository;
    private final ModuleMonetizationRuleRepository ruleRepository;
    private final GuruProductCatalogRepository productRepository;
    private final MonetizationActionRepository actionRepository;

    @Override
    public void run(ApplicationArguments args) {
        seedSettings();
        seedModuleRules();
        seedProducts();
        seedActions();
    }

    // ─── Global Settings ────────────────────────────────────────────

    private void seedSettings() {
        Optional<MonetizationSettings> existingOpt = settingsRepository.findBySettingsKey(PILOT_SETTINGS_KEY);
        if (existingOpt.isPresent()) {
            MonetizationSettings existing = existingOpt.get();
            boolean upgraded = false;

            if (!existing.isGuruPurchaseEnabled()) {
                existing.setGuruPurchaseEnabled(true);
                upgraded = true;
            }
            if (!existing.isPremiumEnabled()) {
                existing.setPremiumEnabled(true);
                upgraded = true;
            }
            if (!existing.isTrialEnabled()) {
                existing.setTrialEnabled(true);
                upgraded = true;
            }
            if (existing.getDefaultTrialDays() <= 0) {
                existing.setDefaultTrialDays(3);
                upgraded = true;
            }
            if (!existing.isTokenPurchaseEnabled()) {
                existing.setTokenPurchaseEnabled(true);
                upgraded = true;
            }
            if (!existing.isRevenueCatEnabled()) {
                existing.setRevenueCatEnabled(true);
                upgraded = true;
            }

            if (upgraded) {
                settingsRepository.save(existing);
                log.info("[MonetizationBootstrap] Upgraded legacy settings '{}'", PILOT_SETTINGS_KEY);
            } else {
                log.debug("[MonetizationBootstrap] Settings '{}' already exists, skipping", PILOT_SETTINGS_KEY);
            }
            return;
        }

        MonetizationSettings settings = MonetizationSettings.builder()
                .settingsKey(PILOT_SETTINGS_KEY)
                .isEnabled(true)
                .isAdsEnabled(true)
                .isGuruEnabled(true)
                .isGuruPurchaseEnabled(true)
                .isSignupBonusEnabled(true)
                .signupBonusTokenAmount(10)
                .signupBonusLedgerReason("SIGNUP_BONUS")
                .isSignupBonusOneTimeOnly(true)
                .signupBonusHelperText("Yeni uyeler icin tek seferlik hos geldin Guru bakiyesi")
                .premiumEnabled(true)
                .trialEnabled(true)
                .defaultTrialDays(3)
                .tokenPurchaseEnabled(true)
                .revenueCatEnabled(true)
                .hideAdsForPremiumUsers(true)
                .allowPremiumAndTokenTogether(true)
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
        Optional<ModuleMonetizationRule> existingOpt = ruleRepository.findByModuleKeyAndConfigVersion(moduleKey, PILOT_CONFIG_VERSION);
        if (existingOpt.isPresent()) {
            ModuleMonetizationRule existing = existingOpt.get();
            if (!existing.isGuruPurchaseEnabled()) {
                existing.setGuruPurchaseEnabled(true);
                ruleRepository.save(existing);
                log.info("[MonetizationBootstrap] Upgraded rule '{}/v{}' with guru purchase enabled", moduleKey, PILOT_CONFIG_VERSION);
            } else {
                log.debug("[MonetizationBootstrap] Rule '{}/v{}' already exists, skipping", moduleKey, PILOT_CONFIG_VERSION);
            }
            return;
        }

        ModuleMonetizationRule rule = ModuleMonetizationRule.builder()
                .moduleKey(moduleKey)
                .isEnabled(true)
                .isAdsEnabled(true)
                .isGuruEnabled(true)
                .isGuruPurchaseEnabled(true)
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

    // ─── Products (Phase 5 defaults) ────────────────────────────────

    private void seedProducts() {
        seedProduct(
                "premium_monthly",
                GuruProductCatalog.ProductType.SUBSCRIPTION,
                "Premium Aylik",
                "Aylik Astro Guru Premium aboneligi",
                0,
                0,
                "astroguru_premium_monthly",
                "astroguru_premium_monthly",
                "astroguru_premium_monthly",
                "Astro Guru Pro",
                3,
                10,
                null,
                null);
        seedProduct(
                "premium_yearly",
                GuruProductCatalog.ProductType.SUBSCRIPTION,
                "Premium Yillik",
                "Yillik Astro Guru Premium aboneligi",
                0,
                0,
                "astroguru_premium_yearly",
                "astroguru_premium_yearly",
                "astroguru_premium_yearly",
                "Astro Guru Pro",
                3,
                20,
                "En Populer",
                null);
        seedProduct(
                "token_50",
                GuruProductCatalog.ProductType.CONSUMABLE,
                "50 Guru Token",
                "Kucuk paket, tekil analizler icin hizli bakiye yuklemesi",
                50,
                0,
                "guru_tokens_50",
                "guru_tokens_50",
                "guru_tokens_50",
                null,
                0,
                110,
                null,
                null);
        seedProduct(
                "token_150",
                GuruProductCatalog.ProductType.CONSUMABLE,
                "150 Guru Token",
                "Orta paket, birden fazla premium yorum icin ideal",
                150,
                0,
                "guru_tokens_150",
                "guru_tokens_150",
                "guru_tokens_150",
                null,
                0,
                120,
                "Avantajli",
                null);
        seedProduct(
                "token_500",
                GuruProductCatalog.ProductType.CONSUMABLE,
                "500 Guru Token",
                "Yuksek kullanim icin buyuk token paketi",
                500,
                0,
                "guru_tokens_500",
                "guru_tokens_500",
                "guru_tokens_500",
                null,
                0,
                130,
                null,
                null);
        seedProduct(
                "token_1200",
                GuruProductCatalog.ProductType.CONSUMABLE,
                "1200 Guru Token",
                "Maksimum bakiye isteyen kullanicilar icin jumbo paket",
                1200,
                0,
                "guru_tokens_1200",
                "guru_tokens_1200",
                "guru_tokens_1200",
                null,
                0,
                140,
                null,
                null);
    }

    private void seedProduct(String productKey,
                             GuruProductCatalog.ProductType productType,
                             String title,
                             String description,
                             int guruAmount,
                             int bonusGuruAmount,
                             String revenueCatProductId,
                             String iosProductId,
                             String androidProductId,
                             String entitlementKey,
                             int trialDurationDays,
                             int sortOrder,
                             String badge,
                             String campaignLabel) {
        Optional<GuruProductCatalog> existingOpt = productRepository.findByProductKey(productKey);
        if (existingOpt.isPresent()) {
            GuruProductCatalog existing = existingOpt.get();
            boolean upgraded = false;

            if (existing.getProductType() != productType) {
                existing.setProductType(productType);
                upgraded = true;
            }
            if (existing.getGuruAmount() != guruAmount) {
                existing.setGuruAmount(guruAmount);
                upgraded = true;
            }
            if (existing.getBonusGuruAmount() != bonusGuruAmount) {
                existing.setBonusGuruAmount(bonusGuruAmount);
                upgraded = true;
            }
            if (!same(existing.getRevenueCatProductId(), revenueCatProductId)) {
                existing.setRevenueCatProductId(revenueCatProductId);
                upgraded = true;
            }
            if (!same(existing.getIosProductId(), iosProductId)) {
                existing.setIosProductId(iosProductId);
                upgraded = true;
            }
            if (!same(existing.getAndroidProductId(), androidProductId)) {
                existing.setAndroidProductId(androidProductId);
                upgraded = true;
            }
            if (!same(existing.getEntitlementKey(), entitlementKey)) {
                existing.setEntitlementKey(entitlementKey);
                upgraded = true;
            }
            if (!existing.isEnabled()) {
                existing.setEnabled(true);
                upgraded = true;
            }
            if (existing.getRolloutStatus() != GuruProductCatalog.RolloutStatus.ENABLED) {
                existing.setRolloutStatus(GuruProductCatalog.RolloutStatus.ENABLED);
                upgraded = true;
            }

            if (upgraded) {
                productRepository.save(existing);
                log.info("[MonetizationBootstrap] Upgraded guru product '{}'", productKey);
            } else {
                log.debug("[MonetizationBootstrap] Product '{}' already exists, skipping", productKey);
            }
            return;
        }

        GuruProductCatalog product = GuruProductCatalog.builder()
                .productKey(productKey)
                .productType(productType)
                .title(title)
                .description(description)
                .guruAmount(guruAmount)
                .bonusGuruAmount(bonusGuruAmount)
                .currency("TRY")
                .iosProductId(iosProductId)
                .androidProductId(androidProductId)
                .revenueCatProductId(revenueCatProductId)
                .entitlementKey(entitlementKey)
                .trialDurationDays(trialDurationDays)
                .isEnabled(true)
                .sortOrder(sortOrder)
                .badge(badge)
                .campaignLabel(campaignLabel)
                .rolloutStatus(GuruProductCatalog.RolloutStatus.ENABLED)
                .createdByAdminId(0L)
                .updatedByAdminId(0L)
                .build();

        productRepository.save(product);
        log.info("[MonetizationBootstrap] Created guru product '{}'", productKey);
    }

    private static boolean same(String left, String right) {
        String l = left == null ? "" : left.trim();
        String r = right == null ? "" : right.trim();
        return l.equals(r);
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
