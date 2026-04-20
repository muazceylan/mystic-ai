package com.mysticai.notification.service.monetization;

import com.mysticai.notification.entity.monetization.GuruLedger;
import com.mysticai.notification.entity.monetization.GuruWallet;
import com.mysticai.notification.entity.monetization.ModuleMonetizationRule;
import com.mysticai.notification.entity.monetization.MonetizationAction;
import com.mysticai.notification.entity.monetization.MonetizationSettings;
import com.mysticai.notification.repository.GuruLedgerRepository;
import com.mysticai.notification.repository.GuruWalletRepository;
import com.mysticai.notification.repository.ModuleMonetizationRuleRepository;
import com.mysticai.notification.repository.MonetizationActionRepository;
import com.mysticai.notification.repository.MonetizationSettingsRepository;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeatureAccessServiceTest {

    private static final Long USER_ID = 42L;
    private static final String MODULE_KEY = "compatibility";
    private static final String ACTION_KEY = "compatibility_view";

    @Mock MonetizationSettingsRepository settingsRepository;
    @Mock ModuleMonetizationRuleRepository ruleRepository;
    @Mock MonetizationActionRepository actionRepository;
    @Mock GuruWalletRepository walletRepository;
    @Mock GuruLedgerRepository ledgerRepository;
    @Mock GuruWalletService guruWalletService;
    @Mock(answer = Answers.RETURNS_DEEP_STUBS) MeterRegistry meterRegistry;

    @InjectMocks FeatureAccessService service;

    @Test
    void evaluateAccess_returnsSpendTokenWhenBalanceSufficient() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, 3))
                .thenReturn(Optional.of(rule()));
        when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(action()));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(3).build()));
        when(ledgerRepository.countByUserIdAndModuleKeyAndActionKeyAndTransactionTypeSince(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(GuruLedger.TransactionType.GURU_SPENT), any(LocalDateTime.class)))
                .thenReturn(0L);

        FeatureAccessService.FeatureAccessResponse response = service.evaluateAccess(USER_ID, MODULE_KEY, ACTION_KEY);

        assertThat(response.allowed()).isTrue();
        assertThat(response.requiresToken()).isTrue();
        assertThat(response.tokenCost()).isEqualTo(1);
        assertThat(response.actionType()).isEqualTo(FeatureAccessService.ActionType.SPEND_TOKEN.name());
        assertThat(response.rewardedAdAvailable()).isTrue();
    }

    @Test
    void evaluateAccess_returnsRewardFallbackWhenBalanceInsufficient() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, 3))
                .thenReturn(Optional.of(rule()));
        when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(action()));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(0).build()));
        when(ledgerRepository.countByUserIdAndModuleKeyAndActionKeyAndTransactionTypeSince(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(GuruLedger.TransactionType.GURU_SPENT), any(LocalDateTime.class)))
                .thenReturn(0L);

        FeatureAccessService.FeatureAccessResponse response = service.evaluateAccess(USER_ID, MODULE_KEY, ACTION_KEY);

        assertThat(response.allowed()).isFalse();
        assertThat(response.status()).isEqualTo(FeatureAccessService.AccessStatus.INSUFFICIENT_BALANCE.name());
        assertThat(response.actionType()).isEqualTo(FeatureAccessService.ActionType.WATCH_REWARDED_AD.name());
        assertThat(response.rewardTokenAmount()).isEqualTo(1);
    }

    @Test
    void consumeAccess_spendsTokenAndReturnsConsumedStatus() {
        GuruWallet lockedWallet = GuruWallet.builder().userId(USER_ID).currentBalance(2).build();
        GuruLedger ledger = GuruLedger.builder()
                .id(UUID.randomUUID())
                .userId(USER_ID)
                .transactionType(GuruLedger.TransactionType.GURU_SPENT)
                .sourceType(GuruLedger.SourceType.ACTION_UNLOCK)
                .amount(-1)
                .balanceBefore(2)
                .balanceAfter(1)
                .moduleKey(MODULE_KEY)
                .actionKey(ACTION_KEY)
                .idempotencyKey("consume-1")
                .build();

        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, 3))
                .thenReturn(Optional.of(rule()));
        when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(action()));
        when(walletRepository.findByUserIdForUpdate(USER_ID)).thenReturn(Optional.of(lockedWallet));
        when(ledgerRepository.countByUserIdAndModuleKeyAndActionKeyAndTransactionTypeSince(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(GuruLedger.TransactionType.GURU_SPENT), any(LocalDateTime.class)))
                .thenReturn(0L);
        when(guruWalletService.spendGuru(USER_ID, 1, MODULE_KEY, ACTION_KEY, "ios", "tr", "consume-1", "{\"sourceScreen\":\"compatibility\",\"analyticsKey\":\"COMPATIBILITY_VIEW\"}"))
                .thenReturn(ledger);

        FeatureAccessService.FeatureAccessResponse response = service.consumeAccess(
                USER_ID,
                MODULE_KEY,
                ACTION_KEY,
                "ios",
                "tr",
                "consume-1",
                "compatibility"
        );

        assertThat(response.allowed()).isTrue();
        assertThat(response.status()).isEqualTo(FeatureAccessService.AccessStatus.TOKEN_CONSUMED.name());
        assertThat(response.currentBalance()).isEqualTo(1);
    }

    @Test
    void consumeAccess_duplicateIdempotency_returnsReplayWithoutRespending() {
        GuruLedger ledger = GuruLedger.builder()
                .id(UUID.randomUUID())
                .userId(USER_ID)
                .transactionType(GuruLedger.TransactionType.GURU_SPENT)
                .sourceType(GuruLedger.SourceType.ACTION_UNLOCK)
                .amount(-1)
                .balanceBefore(2)
                .balanceAfter(1)
                .moduleKey(MODULE_KEY)
                .actionKey(ACTION_KEY)
                .idempotencyKey("consume-dup")
                .build();

        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, 3))
                .thenReturn(Optional.of(rule()));
        when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(action()));
        when(ledgerRepository.existsByIdempotencyKey("consume-dup")).thenReturn(true);
        when(ledgerRepository.findByIdempotencyKey("consume-dup")).thenReturn(Optional.of(ledger));
        when(walletRepository.findByUserId(USER_ID)).thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(1).build()));

        FeatureAccessService.FeatureAccessResponse response = service.consumeAccess(
                USER_ID,
                MODULE_KEY,
                ACTION_KEY,
                "ios",
                "tr",
                "consume-dup",
                "compatibility"
        );

        assertThat(response.allowed()).isTrue();
        assertThat(response.status()).isEqualTo(FeatureAccessService.AccessStatus.TOKEN_CONSUMED.name());
        verify(guruWalletService, never()).spendGuru(anyLong(), anyInt(), any(), any(), any(), any(), any(), any());
    }

    private MonetizationSettings settings() {
        return MonetizationSettings.builder()
                .settingsKey("default")
                .isEnabled(true)
                .isAdsEnabled(true)
                .isGuruEnabled(true)
                .isGuruPurchaseEnabled(false)
                .configVersion(3)
                .status(MonetizationSettings.Status.PUBLISHED)
                .build();
    }

    private ModuleMonetizationRule rule() {
        return ModuleMonetizationRule.builder()
                .moduleKey(MODULE_KEY)
                .isEnabled(true)
                .isAdsEnabled(true)
                .isGuruEnabled(true)
                .isGuruPurchaseEnabled(false)
                .rolloutStatus(ModuleMonetizationRule.RolloutStatus.ENABLED)
                .guruRewardAmountPerCompletedAd(1)
                .build();
    }

    private MonetizationAction action() {
        return MonetizationAction.builder()
                .actionKey(ACTION_KEY)
                .moduleKey(MODULE_KEY)
                .displayName("Compatibility View")
                .unlockType(MonetizationAction.UnlockType.GURU_SPEND)
                .guruCost(1)
                .rewardAmount(1)
                .analyticsKey("COMPATIBILITY_VIEW")
                .isRewardFallbackEnabled(true)
                .isEnabled(true)
                .build();
    }
}
