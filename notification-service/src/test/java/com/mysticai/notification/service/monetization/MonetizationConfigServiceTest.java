package com.mysticai.notification.service.monetization;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.notification.entity.monetization.*;
import com.mysticai.notification.repository.*;
import com.mysticai.notification.service.monetization.MonetizationConfigService.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MonetizationConfigServiceTest {

    @Mock MonetizationSettingsRepository settingsRepository;
    @Mock ModuleMonetizationRuleRepository ruleRepository;
    @Mock MonetizationActionRepository actionRepository;
    @Mock GuruProductCatalogRepository productRepository;
    @Mock GuruWalletRepository walletRepository;
    @Mock FeatureAccessService featureAccessService;
    @Spy ObjectMapper objectMapper = new ObjectMapper();

    private WebRewardedAdsEligibilityResolver webRewardedAdsEligibilityResolver;
    private MonetizationConfigService service;

    private static final Long USER_ID = 42L;

    @BeforeEach
    void setUp() {
        webRewardedAdsEligibilityResolver = new WebRewardedAdsEligibilityResolver(settingsRepository, objectMapper);
        ReflectionTestUtils.setField(webRewardedAdsEligibilityResolver, "rewardedAdsKillSwitchEnabled", true);
        service = new MonetizationConfigService(
                settingsRepository,
                ruleRepository,
                actionRepository,
                productRepository,
                walletRepository,
                featureAccessService,
                webRewardedAdsEligibilityResolver
        );
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private MonetizationSettings publishedSettings(boolean enabled) {
        return MonetizationSettings.builder()
                .id(1L)
                .settingsKey("global")
                .isEnabled(enabled)
                .isAdsEnabled(true)
                .isGuruEnabled(true)
                .isGuruPurchaseEnabled(true)
                .defaultAdProvider("admob")
                .globalDailyAdCap(10)
                .globalWeeklyAdCap(50)
                .globalMinHoursBetweenOffers(1)
                .globalMinSessionsBetweenOffers(1)
                .configVersion(1)
                .status(MonetizationSettings.Status.PUBLISHED)
                .build();
    }

    private ModuleMonetizationRule enabledRule(String moduleKey, int configVersion) {
        return ModuleMonetizationRule.builder()
                .id(1L)
                .moduleKey(moduleKey)
                .isEnabled(true)
                .isAdsEnabled(true)
                .isGuruEnabled(true)
                .isGuruPurchaseEnabled(true)
                .adStrategy(ModuleMonetizationRule.AdStrategy.ON_ENTRY)
                .adProvider("admob")
                .adFormats("rewarded")
                .firstNEntriesWithoutAd(1)
                .adOfferStartEntry(2)
                .adOfferFrequencyMode(ModuleMonetizationRule.AdOfferFrequencyMode.EVERY_N_ENTRIES)
                .minimumSessionsBetweenOffers(1)
                .minimumHoursBetweenOffers(4)
                .dailyOfferCap(3)
                .weeklyOfferCap(15)
                .guruRewardAmountPerCompletedAd(1)
                .isAllowFreePreview(true)
                .previewDepthMode(ModuleMonetizationRule.PreviewDepthMode.SUMMARY_ONLY)
                .rolloutStatus(ModuleMonetizationRule.RolloutStatus.ENABLED)
                .configVersion(configVersion)
                .build();
    }

    private MonetizationAction enabledAction(String actionKey, String moduleKey, int guruCost) {
        return MonetizationAction.builder()
                .id(1L)
                .actionKey(actionKey)
                .moduleKey(moduleKey)
                .displayName("View Interpretation")
                .unlockType(MonetizationAction.UnlockType.AD_OR_GURU)
                .guruCost(guruCost)
                .rewardAmount(1)
                .isAdRequired(false)
                .isPurchaseRequired(false)
                .isPreviewAllowed(true)
                .isEnabled(true)
                .displayPriority(0)
                .build();
    }

    // ── getActiveConfig ───────────────────────────────────────────────────────

    @Test
    void getActiveConfig_noPublishedSettings_returnsDisabled() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.empty());

        MonetizationConfigResponse result = service.getActiveConfig(null);

        assertThat(result.enabled()).isFalse();
        assertThat(result.webAdsEnabled()).isFalse();
        assertThat(result.moduleRules()).isEmpty();
        assertThat(result.actions()).isEmpty();
        assertThat(result.products()).isEmpty();
    }

    @Test
    void getActiveConfig_publishedSettings_returnsFullConfig() {
        MonetizationSettings settings = publishedSettings(true);
        ModuleMonetizationRule rule = enabledRule("dreams", 1);
        MonetizationAction action = enabledAction("view_interpretation", "dreams", 3);

        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings));
        when(ruleRepository.findAllByIsEnabledTrueAndConfigVersion(1))
                .thenReturn(List.of(rule));
        when(actionRepository.findAllByIsEnabledTrueOrderByModuleKeyAscDisplayPriorityAsc())
                .thenReturn(List.of(action));
        when(productRepository.findAllByIsEnabledTrueAndRolloutStatusOrderBySortOrderAsc(
                GuruProductCatalog.RolloutStatus.ENABLED))
                .thenReturn(List.of());

        MonetizationConfigResponse result = service.getActiveConfig(null);

        assertThat(result.enabled()).isTrue();
        assertThat(result.adsEnabled()).isTrue();
        assertThat(result.webAdsEnabled()).isTrue();
        assertThat(result.guruEnabled()).isTrue();
        assertThat(result.guruPurchaseEnabled()).isTrue();
        assertThat(result.configVersion()).isEqualTo(1);
        assertThat(result.moduleRules()).hasSize(1);
        assertThat(result.moduleRules().get(0).moduleKey()).isEqualTo("dreams");
        assertThat(result.actions()).hasSize(1);
        assertThat(result.actions().get(0).actionKey()).isEqualTo("view_interpretation");
    }

    @Test
    void getActiveConfig_withUserId_includesWalletBalance() {
        MonetizationSettings settings = publishedSettings(true);
        GuruWallet wallet = GuruWallet.builder().userId(USER_ID).currentBalance(25).build();

        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings));
        when(ruleRepository.findAllByIsEnabledTrueAndConfigVersion(1)).thenReturn(List.of());
        when(actionRepository.findAllByIsEnabledTrueOrderByModuleKeyAscDisplayPriorityAsc()).thenReturn(List.of());
        when(productRepository.findAllByIsEnabledTrueAndRolloutStatusOrderBySortOrderAsc(any())).thenReturn(List.of());
        when(walletRepository.findByUserId(USER_ID)).thenReturn(Optional.of(wallet));

        MonetizationConfigResponse result = service.getActiveConfig(USER_ID);

        assertThat(result.walletBalance()).isEqualTo(25);
        assertThat(result.webAdsEnabled()).isTrue();
    }

    @Test
    void getActiveConfig_environmentRulesDisableWebAds_returnsFalse() {
        MonetizationSettings settings = publishedSettings(true);
        settings.setEnvironmentRulesJson("""
                {"platforms":{"web":{"adsEnabled":false}}}
                """);

        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings));
        when(ruleRepository.findAllByIsEnabledTrueAndConfigVersion(1)).thenReturn(List.of());
        when(actionRepository.findAllByIsEnabledTrueOrderByModuleKeyAscDisplayPriorityAsc()).thenReturn(List.of());
        when(productRepository.findAllByIsEnabledTrueAndRolloutStatusOrderBySortOrderAsc(any())).thenReturn(List.of());

        MonetizationConfigResponse result = service.getActiveConfig(null);

        assertThat(result.webAdsEnabled()).isFalse();
    }

    @Test
    void getActiveConfig_envKillSwitchDisablesWebAds_returnsFalse() {
        MonetizationSettings settings = publishedSettings(true);

        ReflectionTestUtils.setField(webRewardedAdsEligibilityResolver, "rewardedAdsKillSwitchEnabled", false);
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings));
        when(ruleRepository.findAllByIsEnabledTrueAndConfigVersion(1)).thenReturn(List.of());
        when(actionRepository.findAllByIsEnabledTrueOrderByModuleKeyAscDisplayPriorityAsc()).thenReturn(List.of());
        when(productRepository.findAllByIsEnabledTrueAndRolloutStatusOrderBySortOrderAsc(any())).thenReturn(List.of());

        MonetizationConfigResponse result = service.getActiveConfig(null);

        assertThat(result.webAdsEnabled()).isFalse();
    }

    // ── getModuleRule ─────────────────────────────────────────────────────────

    @Test
    void getModuleRule_noPublishedSettings_returnsNull() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.empty());

        ModuleRuleResponse result = service.getModuleRule("dreams");

        assertThat(result).isNull();
    }

    // ── checkActionEligibility ────────────────────────────────────────────────

    @Test
    void checkActionEligibility_monetizationDisabled_returnsDisabledReason() {
        when(featureAccessService.evaluateAccess(USER_ID, "dreams", "view"))
                .thenReturn(featureAccessResponse(
                        false,
                        false,
                        false,
                        0,
                        0,
                        false,
                        0,
                        "view",
                        "dreams",
                        FeatureAccessService.ActionType.NONE.name(),
                        FeatureAccessService.AccessStatus.MONETIZATION_DISABLED.name(),
                        "monetization_disabled",
                        false,
                        false
                ));

        EligibilityCheckResponse result = service.checkActionEligibility(USER_ID, "dreams", "view", 5);

        assertThat(result.monetizationActive()).isFalse();
        assertThat(result.reason()).isEqualTo("monetization_disabled");
    }

    @Test
    void checkActionEligibility_actionNotFound_returnsActionNotFound() {
        when(featureAccessService.evaluateAccess(USER_ID, "dreams", "nonexistent"))
                .thenReturn(featureAccessResponse(
                        false,
                        true,
                        false,
                        0,
                        0,
                        false,
                        0,
                        "nonexistent",
                        "dreams",
                        FeatureAccessService.ActionType.NONE.name(),
                        FeatureAccessService.AccessStatus.FEATURE_DISABLED.name(),
                        "action_not_found",
                        false,
                        false
                ));

        EligibilityCheckResponse result = service.checkActionEligibility(USER_ID, "dreams", "nonexistent", 5);

        assertThat(result.monetizationActive()).isTrue();
        assertThat(result.reason()).isEqualTo("action_not_found");
    }

    @Test
    void checkActionEligibility_adEligible_whenEntryCountMeetsThreshold() {
        when(featureAccessService.evaluateAccess(USER_ID, "dreams", "view"))
                .thenReturn(featureAccessResponse(
                        false,
                        true,
                        true,
                        3,
                        0,
                        true,
                        1,
                        "view",
                        "dreams",
                        FeatureAccessService.ActionType.WATCH_REWARDED_AD.name(),
                        FeatureAccessService.AccessStatus.INSUFFICIENT_BALANCE.name(),
                        "feature_access_insufficient_balance",
                        false,
                        true
                ));

        // entryCount=5 is above adOfferStartEntry=2
        EligibilityCheckResponse result = service.checkActionEligibility(USER_ID, "dreams", "view", 5);

        assertThat(result.monetizationActive()).isTrue();
        assertThat(result.adOfferEligible()).isTrue();
    }

    @Test
    void checkActionEligibility_adNotEligible_withinFreeEntries() {
        when(featureAccessService.evaluateAccess(USER_ID, "dreams", "view"))
                .thenReturn(featureAccessResponse(
                        false,
                        true,
                        true,
                        3,
                        0,
                        false,
                        0,
                        "view",
                        "dreams",
                        FeatureAccessService.ActionType.NONE.name(),
                        FeatureAccessService.AccessStatus.INSUFFICIENT_BALANCE.name(),
                        "within_free_entries",
                        false,
                        true
                ));

        EligibilityCheckResponse result = service.checkActionEligibility(USER_ID, "dreams", "view", 0);

        assertThat(result.adOfferEligible()).isFalse();
        assertThat(result.reason()).isEqualTo("within_free_entries");
    }

    @Test
    void checkActionEligibility_guruUnlockAvailable_whenBalanceSufficient() {
        when(featureAccessService.evaluateAccess(USER_ID, "dreams", "view"))
                .thenReturn(featureAccessResponse(
                        true,
                        true,
                        true,
                        3,
                        10,
                        true,
                        1,
                        "view",
                        "dreams",
                        FeatureAccessService.ActionType.SPEND_TOKEN.name(),
                        FeatureAccessService.AccessStatus.TOKEN_REQUIRED.name(),
                        "feature_token_required",
                        false,
                        true
                ));

        EligibilityCheckResponse result = service.checkActionEligibility(USER_ID, "dreams", "view", 5);

        assertThat(result.guruUnlockAvailable()).isTrue();
        assertThat(result.walletBalance()).isEqualTo(10);
        assertThat(result.requiredGuruCost()).isEqualTo(3);
    }

    private FeatureAccessService.FeatureAccessResponse featureAccessResponse(
            boolean allowed,
            boolean monetizationActive,
            boolean requiresToken,
            int tokenCost,
            int currentBalance,
            boolean rewardedAdAvailable,
            int rewardTokenAmount,
            String featureKey,
            String moduleKey,
            String actionType,
            String status,
            String message,
            boolean purchaseFallbackAvailable,
            boolean guruUnlockAvailable
    ) {
        return new FeatureAccessService.FeatureAccessResponse(
                allowed,
                monetizationActive,
                requiresToken,
                tokenCost,
                currentBalance,
                rewardedAdAvailable,
                rewardTokenAmount,
                featureKey,
                moduleKey,
                actionType,
                status,
                message,
                purchaseFallbackAvailable,
                guruUnlockAvailable,
                null,
                null,
                null,
                null,
                null,
                0,
                0,
                0,
                0
        );
    }
}
