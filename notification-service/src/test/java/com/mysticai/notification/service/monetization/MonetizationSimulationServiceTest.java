package com.mysticai.notification.service.monetization;

import com.mysticai.notification.admin.service.monetization.MonetizationSimulationService;
import com.mysticai.notification.admin.service.monetization.MonetizationSimulationService.SimulationRequest;
import com.mysticai.notification.admin.service.monetization.MonetizationSimulationService.SimulationResult;
import com.mysticai.notification.entity.monetization.ModuleMonetizationRule;
import com.mysticai.notification.entity.monetization.MonetizationAction;
import com.mysticai.notification.entity.monetization.MonetizationSettings;
import com.mysticai.notification.repository.ModuleMonetizationRuleRepository;
import com.mysticai.notification.repository.MonetizationActionRepository;
import com.mysticai.notification.repository.MonetizationSettingsRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MonetizationSimulationServiceTest {

    @Mock MonetizationSettingsRepository settingsRepository;
    @Mock ModuleMonetizationRuleRepository ruleRepository;
    @Mock MonetizationActionRepository actionRepository;

    @InjectMocks MonetizationSimulationService service;

    // ── helpers ───────────────────────────────────────────────────────────────

    private MonetizationSettings publishedSettings() {
        return MonetizationSettings.builder()
                .id(1L)
                .settingsKey("global")
                .isEnabled(true)
                .isAdsEnabled(true)
                .isGuruEnabled(true)
                .isGuruPurchaseEnabled(true)
                .configVersion(1)
                .status(MonetizationSettings.Status.PUBLISHED)
                .build();
    }

    private ModuleMonetizationRule enabledRule(String moduleKey) {
        return ModuleMonetizationRule.builder()
                .id(1L)
                .moduleKey(moduleKey)
                .isEnabled(true)
                .isAdsEnabled(true)
                .isGuruEnabled(true)
                .isGuruPurchaseEnabled(true)
                .firstNEntriesWithoutAd(2)
                .adOfferStartEntry(3)
                .dailyOfferCap(5)
                .weeklyOfferCap(20)
                .minimumHoursBetweenOffers(4)
                .guruRewardAmountPerCompletedAd(1)
                .isAllowFreePreview(false)
                .previewDepthMode(ModuleMonetizationRule.PreviewDepthMode.SUMMARY_ONLY)
                .rolloutStatus(ModuleMonetizationRule.RolloutStatus.ENABLED)
                .configVersion(1)
                .build();
    }

    private MonetizationAction enabledAction(String actionKey, String moduleKey, int guruCost) {
        return MonetizationAction.builder()
                .id(1L)
                .actionKey(actionKey)
                .moduleKey(moduleKey)
                .isEnabled(true)
                .guruCost(guruCost)
                .build();
    }

    private SimulationRequest request(String moduleKey, String actionKey,
                                       int entryCount, int dailyAdCount,
                                       int weeklyAdCount, double hoursSinceLast,
                                       int walletBalance) {
        return new SimulationRequest(moduleKey, actionKey, entryCount,
                dailyAdCount, weeklyAdCount, hoursSinceLast, walletBalance, "ios", "tr");
    }

    // ── tests ─────────────────────────────────────────────────────────────────

    @Test
    void simulate_monetizationDisabled_returnsEmptyDecisions() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.empty());

        SimulationResult result = service.simulate(request("dreams", "view", 5, 0, 0, 10, 10));

        assertThat(result.monetizationActive()).isFalse();
        assertThat(result.decisions()).anyMatch(d -> d.contains("MONETIZATION_DISABLED"));
    }

    @Test
    void simulate_moduleDisabled_returnsModuleDisabledDecision() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(publishedSettings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion("dreams", 1))
                .thenReturn(Optional.empty());

        SimulationResult result = service.simulate(request("dreams", "view", 5, 0, 0, 10, 10));

        assertThat(result.monetizationActive()).isFalse();
        assertThat(result.decisions()).anyMatch(d -> d.contains("MODULE_DISABLED"));
    }

    @Test
    void simulate_adSkippedWithinFreeEntries() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(publishedSettings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion("dreams", 1))
                .thenReturn(Optional.of(enabledRule("dreams")));

        // entryCount=1 < firstNEntriesWithoutAd=2
        SimulationResult result = service.simulate(request("dreams", null, 1, 0, 0, 10, 0));

        assertThat(result.adOfferEligible()).isFalse();
        assertThat(result.decisions()).anyMatch(d -> d.contains("AD_SKIPPED") && d.contains("free entries"));
    }

    @Test
    void simulate_adEligible_whenEntryCountExceedsThreshold() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(publishedSettings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion("dreams", 1))
                .thenReturn(Optional.of(enabledRule("dreams")));

        // entryCount=5 >= adOfferStartEntry=3, no caps or cooldown hit
        SimulationResult result = service.simulate(request("dreams", null, 5, 0, 0, 10, 0));

        assertThat(result.adOfferEligible()).isTrue();
        assertThat(result.decisions()).anyMatch(d -> d.contains("AD_ELIGIBLE"));
    }

    @Test
    void simulate_adCapped_whenDailyCapReached() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(publishedSettings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion("dreams", 1))
                .thenReturn(Optional.of(enabledRule("dreams")));

        // dailyAdCount=5 >= dailyOfferCap=5
        SimulationResult result = service.simulate(request("dreams", null, 5, 5, 0, 10, 0));

        assertThat(result.adOfferEligible()).isFalse();
        assertThat(result.decisions()).anyMatch(d -> d.contains("AD_CAPPED") && d.contains("Daily"));
    }

    @Test
    void simulate_adCooldown_whenHoursSinceLastOfferBelowMinimum() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(publishedSettings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion("dreams", 1))
                .thenReturn(Optional.of(enabledRule("dreams")));

        // hoursSinceLastOffer=1 < minimumHoursBetweenOffers=4
        SimulationResult result = service.simulate(request("dreams", null, 5, 0, 0, 1, 0));

        assertThat(result.adOfferEligible()).isFalse();
        assertThat(result.decisions()).anyMatch(d -> d.contains("AD_COOLDOWN"));
    }

    @Test
    void simulate_guruUnlockAvailable_whenBalanceSufficient() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(publishedSettings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion("dreams", 1))
                .thenReturn(Optional.of(enabledRule("dreams")));
        when(actionRepository.findByActionKeyAndModuleKey("view", "dreams"))
                .thenReturn(Optional.of(enabledAction("view", "dreams", 3)));

        // walletBalance=10 >= guruCost=3
        SimulationResult result = service.simulate(request("dreams", "view", 5, 0, 0, 10, 10));

        assertThat(result.guruUnlockAvailable()).isTrue();
        assertThat(result.decisions()).anyMatch(d -> d.contains("GURU_UNLOCK_AVAILABLE"));
    }

    @Test
    void simulate_guruInsufficient_whenBalanceTooLow() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(publishedSettings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion("dreams", 1))
                .thenReturn(Optional.of(enabledRule("dreams")));
        when(actionRepository.findByActionKeyAndModuleKey("view", "dreams"))
                .thenReturn(Optional.of(enabledAction("view", "dreams", 5)));

        // walletBalance=2 < guruCost=5
        SimulationResult result = service.simulate(request("dreams", "view", 5, 0, 0, 10, 2));

        assertThat(result.guruUnlockAvailable()).isFalse();
        assertThat(result.decisions()).anyMatch(d -> d.contains("GURU_INSUFFICIENT"));
    }

    @Test
    void simulate_purchaseFallbackAvailable_whenEnabled() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(publishedSettings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion("dreams", 1))
                .thenReturn(Optional.of(enabledRule("dreams")));

        SimulationResult result = service.simulate(request("dreams", null, 5, 0, 0, 10, 0));

        assertThat(result.purchaseFallbackAvailable()).isTrue();
        assertThat(result.decisions()).anyMatch(d -> d.contains("PURCHASE_FALLBACK_AVAILABLE"));
    }
}
