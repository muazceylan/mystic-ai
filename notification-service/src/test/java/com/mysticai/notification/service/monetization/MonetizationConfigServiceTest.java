package com.mysticai.notification.service.monetization;

import com.mysticai.notification.entity.monetization.*;
import com.mysticai.notification.repository.*;
import com.mysticai.notification.service.monetization.MonetizationConfigService.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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

    @InjectMocks MonetizationConfigService service;

    private static final Long USER_ID = 42L;

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
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.empty());

        EligibilityCheckResponse result = service.checkActionEligibility(USER_ID, "dreams", "view", 5);

        assertThat(result.monetizationActive()).isFalse();
        assertThat(result.reason()).isEqualTo("monetization_disabled");
    }

    @Test
    void checkActionEligibility_actionNotFound_returnsActionNotFound() {
        MonetizationSettings settings = publishedSettings(true);
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings));
        when(actionRepository.findByActionKeyAndModuleKey("nonexistent", "dreams"))
                .thenReturn(Optional.empty());

        EligibilityCheckResponse result = service.checkActionEligibility(USER_ID, "dreams", "nonexistent", 5);

        assertThat(result.monetizationActive()).isTrue();
        assertThat(result.reason()).isEqualTo("action_not_found");
    }

    @Test
    void checkActionEligibility_adEligible_whenEntryCountMeetsThreshold() {
        MonetizationSettings settings = publishedSettings(true);
        MonetizationAction action = enabledAction("view", "dreams", 3);
        ModuleMonetizationRule rule = enabledRule("dreams", 1);
        // adOfferStartEntry defaults to 2, firstNEntriesWithoutAd defaults to 1
        GuruWallet wallet = GuruWallet.builder().userId(USER_ID).currentBalance(0).build();

        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings));
        when(actionRepository.findByActionKeyAndModuleKey("view", "dreams"))
                .thenReturn(Optional.of(action));
        when(ruleRepository.findByModuleKeyAndConfigVersion("dreams", 1))
                .thenReturn(Optional.of(rule));
        when(walletRepository.findByUserId(USER_ID)).thenReturn(Optional.of(wallet));

        // entryCount=5 is above adOfferStartEntry=2
        EligibilityCheckResponse result = service.checkActionEligibility(USER_ID, "dreams", "view", 5);

        assertThat(result.monetizationActive()).isTrue();
        assertThat(result.adOfferEligible()).isTrue();
    }

    @Test
    void checkActionEligibility_adNotEligible_withinFreeEntries() {
        MonetizationSettings settings = publishedSettings(true);
        MonetizationAction action = enabledAction("view", "dreams", 3);
        ModuleMonetizationRule rule = enabledRule("dreams", 1);
        // firstNEntriesWithoutAd = 1, so entryCount 0 is within free entries
        GuruWallet wallet = GuruWallet.builder().userId(USER_ID).currentBalance(0).build();

        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings));
        when(actionRepository.findByActionKeyAndModuleKey("view", "dreams"))
                .thenReturn(Optional.of(action));
        when(ruleRepository.findByModuleKeyAndConfigVersion("dreams", 1))
                .thenReturn(Optional.of(rule));
        when(walletRepository.findByUserId(USER_ID)).thenReturn(Optional.of(wallet));

        EligibilityCheckResponse result = service.checkActionEligibility(USER_ID, "dreams", "view", 0);

        assertThat(result.adOfferEligible()).isFalse();
        assertThat(result.reason()).isEqualTo("within_free_entries");
    }

    @Test
    void checkActionEligibility_guruUnlockAvailable_whenBalanceSufficient() {
        MonetizationSettings settings = publishedSettings(true);
        MonetizationAction action = enabledAction("view", "dreams", 3);
        ModuleMonetizationRule rule = enabledRule("dreams", 1);
        GuruWallet wallet = GuruWallet.builder().userId(USER_ID).currentBalance(10).build();

        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings));
        when(actionRepository.findByActionKeyAndModuleKey("view", "dreams"))
                .thenReturn(Optional.of(action));
        when(ruleRepository.findByModuleKeyAndConfigVersion("dreams", 1))
                .thenReturn(Optional.of(rule));
        when(walletRepository.findByUserId(USER_ID)).thenReturn(Optional.of(wallet));

        EligibilityCheckResponse result = service.checkActionEligibility(USER_ID, "dreams", "view", 5);

        assertThat(result.guruUnlockAvailable()).isTrue();
        assertThat(result.walletBalance()).isEqualTo(10);
        assertThat(result.requiredGuruCost()).isEqualTo(3);
    }
}
