package com.mysticai.notification.service.monetization;

import com.mysticai.notification.entity.monetization.GuruLedger;
import com.mysticai.notification.entity.monetization.GuruWallet;
import com.mysticai.notification.entity.monetization.ModuleMonetizationRule;
import com.mysticai.notification.entity.monetization.MonetizationAction;
import com.mysticai.notification.entity.monetization.MonetizationSettings;
import com.mysticai.notification.entity.monetization.RewardedUnlockProgress;
import com.mysticai.notification.repository.GuruLedgerRepository;
import com.mysticai.notification.repository.GuruWalletRepository;
import com.mysticai.notification.repository.ModuleMonetizationRuleRepository;
import com.mysticai.notification.repository.MonetizationActionRepository;
import com.mysticai.notification.repository.MonetizationSettingsRepository;
import com.mysticai.notification.repository.RewardedUnlockProgressRepository;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.BeforeEach;
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
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
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
    @Mock EntitlementService entitlementService;
    @Mock(answer = Answers.RETURNS_DEEP_STUBS) MeterRegistry meterRegistry;
    @Mock RewardedUnlockProgressRepository rewardedUnlockProgressRepository;

    @InjectMocks FeatureAccessService service;

    @BeforeEach
    void setUpRewardedUnlockDefault() {
        lenient().when(rewardedUnlockProgressRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByUnlockedAtDesc(
                anyLong(),
                any(),
                any(),
                isNull(),
                eq(RewardedUnlockProgress.Status.UNLOCKED),
                any(LocalDateTime.class)
        )).thenReturn(Optional.empty());
    }

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
        when(entitlementService.getSnapshot(USER_ID)).thenReturn(noEntitlement());
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
        when(entitlementService.getSnapshot(USER_ID)).thenReturn(noEntitlement());
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
    void evaluateAccess_allowsWhenRewardedUnlockProgressIsUnlocked() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, 3))
                .thenReturn(Optional.of(rule()));
        when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(actionWithGuruCost(2)));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(0).build()));
        when(entitlementService.getSnapshot(USER_ID)).thenReturn(noEntitlement());
        when(ledgerRepository.countByUserIdAndModuleKeyAndActionKeyAndTransactionTypeSince(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(GuruLedger.TransactionType.GURU_SPENT), any(LocalDateTime.class)))
                .thenReturn(0L);
        when(rewardedUnlockProgressRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByUnlockedAtDesc(
                eq(USER_ID),
                eq(MODULE_KEY),
                eq(ACTION_KEY),
                isNull(),
                eq(RewardedUnlockProgress.Status.UNLOCKED),
                any(LocalDateTime.class)
        )).thenReturn(Optional.of(RewardedUnlockProgress.builder()
                .userId(USER_ID)
                .moduleKey(MODULE_KEY)
                .actionKey(ACTION_KEY)
                .requiredViews(2)
                .completedViews(2)
                .status(RewardedUnlockProgress.Status.UNLOCKED)
                .unlockedAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build()));

        FeatureAccessService.FeatureAccessResponse response = service.evaluateAccess(USER_ID, MODULE_KEY, ACTION_KEY);

        assertThat(response.allowed()).isTrue();
        assertThat(response.requiresToken()).isFalse();
        assertThat(response.tokenCost()).isZero();
        assertThat(response.actionType()).isEqualTo(FeatureAccessService.ActionType.CONTINUE.name());
        assertThat(response.message()).isEqualTo("feature_rewarded_unlock_unlocked");
        assertThat(response.originalTokenCost()).isEqualTo(2);
        assertThat(response.chargedTokenAmount()).isZero();
    }

    @Test
    void evaluateAccess_rewardedUnlockContentKeyMustMatch() {
        String geminiKey = "horoscope:weekly:gemini:2026-W21";
        String ariesKey = "horoscope:weekly:aries:2026-W21";

        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, 3))
                .thenReturn(Optional.of(rule()));
        when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(actionWithGuruCost(2)));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(0).build()));
        when(entitlementService.getSnapshot(USER_ID)).thenReturn(noEntitlement());
        when(ledgerRepository.countByUserIdAndModuleKeyAndActionKeyAndTransactionTypeSince(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(GuruLedger.TransactionType.GURU_SPENT), any(LocalDateTime.class)))
                .thenReturn(0L);
        when(rewardedUnlockProgressRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByUnlockedAtDesc(
                eq(USER_ID),
                eq(MODULE_KEY),
                eq(ACTION_KEY),
                eq(geminiKey),
                eq(RewardedUnlockProgress.Status.UNLOCKED),
                any(LocalDateTime.class)
        )).thenReturn(Optional.of(RewardedUnlockProgress.builder()
                .userId(USER_ID)
                .moduleKey(MODULE_KEY)
                .actionKey(ACTION_KEY)
                .contentKey(geminiKey)
                .requiredViews(2)
                .completedViews(2)
                .status(RewardedUnlockProgress.Status.UNLOCKED)
                .unlockedAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build()));
        when(rewardedUnlockProgressRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByUnlockedAtDesc(
                eq(USER_ID),
                eq(MODULE_KEY),
                eq(ACTION_KEY),
                eq(ariesKey),
                eq(RewardedUnlockProgress.Status.UNLOCKED),
                any(LocalDateTime.class)
        )).thenReturn(Optional.empty());

        FeatureAccessService.FeatureAccessResponse gemini = service.evaluateAccess(USER_ID, MODULE_KEY, ACTION_KEY, geminiKey);
        FeatureAccessService.FeatureAccessResponse aries = service.evaluateAccess(USER_ID, MODULE_KEY, ACTION_KEY, ariesKey);

        assertThat(gemini.allowed()).isTrue();
        assertThat(gemini.tokenCost()).isZero();
        assertThat(aries.allowed()).isFalse();
        assertThat(aries.status()).isEqualTo(FeatureAccessService.AccessStatus.INSUFFICIENT_BALANCE.name());
    }

    @Test
    void evaluateAccess_normalizesZeroGuruCostLockedActionToOneToken() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, 3))
                .thenReturn(Optional.of(rule()));
        when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(actionWithGuruCost(0)));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(1).build()));
        when(entitlementService.getSnapshot(USER_ID)).thenReturn(noEntitlement());
        when(ledgerRepository.countByUserIdAndModuleKeyAndActionKeyAndTransactionTypeSince(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(GuruLedger.TransactionType.GURU_SPENT), any(LocalDateTime.class)))
                .thenReturn(0L);

        FeatureAccessService.FeatureAccessResponse response = service.evaluateAccess(USER_ID, MODULE_KEY, ACTION_KEY);

        assertThat(response.requiresToken()).isTrue();
        assertThat(response.tokenCost()).isEqualTo(1);
        assertThat(response.originalTokenCost()).isEqualTo(1);
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
        when(entitlementService.getSnapshot(USER_ID)).thenReturn(noEntitlement());
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
        when(entitlementService.getSnapshot(USER_ID)).thenReturn(noEntitlement());

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

    @Test
    void premiumActive_unlockFree_allowsWithoutSpendingTokens() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, 3))
                .thenReturn(Optional.of(ruleWithPremium(
                        ModuleMonetizationRule.PremiumBehavior.UNLOCK_FREE,
                        0,
                        false,
                        false)));
        when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(action()));
        when(walletRepository.findByUserIdForUpdate(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(0).build()));
        when(entitlementService.getSnapshot(USER_ID)).thenReturn(activeEntitlement("ACTIVE"));
        when(ledgerRepository.countByUserIdAndModuleKeyAndActionKeyAndTransactionTypeSince(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(GuruLedger.TransactionType.GURU_SPENT), any(LocalDateTime.class)))
                .thenReturn(0L);

        FeatureAccessService.FeatureAccessResponse response = service.consumeAccess(
                USER_ID, MODULE_KEY, ACTION_KEY, "ios", "tr", "consume-premium-free", "compatibility");

        assertThat(response.allowed()).isTrue();
        assertThat(response.requiresToken()).isFalse();
        assertThat(response.tokenCost()).isZero();
        assertThat(response.premiumApplied()).isTrue();
        assertThat(response.premiumBehavior()).isEqualTo(ModuleMonetizationRule.PremiumBehavior.UNLOCK_FREE.name());
        verify(guruWalletService, never()).spendGuru(anyLong(), anyInt(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void trialingWithTrialUnlockEnabled_usesPremiumRule() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, 3))
                .thenReturn(Optional.of(ruleWithPremium(
                        ModuleMonetizationRule.PremiumBehavior.UNLOCK_FREE,
                        0,
                        false,
                        true)));
        when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(action()));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(0).build()));
        when(entitlementService.getSnapshot(USER_ID)).thenReturn(trialingEntitlement());
        when(ledgerRepository.countByUserIdAndModuleKeyAndActionKeyAndTransactionTypeSince(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(GuruLedger.TransactionType.GURU_SPENT), any(LocalDateTime.class)))
                .thenReturn(0L);

        FeatureAccessService.FeatureAccessResponse response = service.evaluateAccess(USER_ID, MODULE_KEY, ACTION_KEY);

        assertThat(response.allowed()).isTrue();
        assertThat(response.requiresToken()).isFalse();
        assertThat(response.trialing()).isTrue();
        assertThat(response.premiumApplied()).isTrue();
    }

    @Test
    void trialingWithoutTrialUnlockEnabled_behavesLikeFreeUser() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, 3))
                .thenReturn(Optional.of(ruleWithPremium(
                        ModuleMonetizationRule.PremiumBehavior.UNLOCK_FREE,
                        0,
                        false,
                        false)));
        when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(action()));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(3).build()));
        when(entitlementService.getSnapshot(USER_ID)).thenReturn(trialingEntitlement());
        when(ledgerRepository.countByUserIdAndModuleKeyAndActionKeyAndTransactionTypeSince(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(GuruLedger.TransactionType.GURU_SPENT), any(LocalDateTime.class)))
                .thenReturn(0L);

        FeatureAccessService.FeatureAccessResponse response = service.evaluateAccess(USER_ID, MODULE_KEY, ACTION_KEY);

        assertThat(response.allowed()).isTrue();
        assertThat(response.requiresToken()).isTrue();
        assertThat(response.tokenCost()).isEqualTo(1);
        assertThat(response.premiumApplied()).isFalse();
    }

    @Test
    void premiumActive_discountTokenCost_usesPremiumTokenCost() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, 3))
                .thenReturn(Optional.of(ruleWithPremium(
                        ModuleMonetizationRule.PremiumBehavior.DISCOUNT_TOKEN_COST,
                        1,
                        false,
                        false)));
        when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(actionWithGuruCost(3)));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(2).build()));
        when(entitlementService.getSnapshot(USER_ID)).thenReturn(activeEntitlement("ACTIVE"));
        when(ledgerRepository.countByUserIdAndModuleKeyAndActionKeyAndTransactionTypeSince(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(GuruLedger.TransactionType.GURU_SPENT), any(LocalDateTime.class)))
                .thenReturn(0L);

        FeatureAccessService.FeatureAccessResponse response = service.evaluateAccess(USER_ID, MODULE_KEY, ACTION_KEY);

        assertThat(response.allowed()).isTrue();
        assertThat(response.tokenCost()).isEqualTo(1);
        assertThat(response.originalTokenCost()).isEqualTo(3);
        assertThat(response.discountedTokenCost()).isEqualTo(1);
    }

    @Test
    void premiumActive_tokenRequiredEvenPremium_keepsOriginalTokenCost() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, 3))
                .thenReturn(Optional.of(ruleWithPremium(
                        ModuleMonetizationRule.PremiumBehavior.TOKEN_REQUIRED_EVEN_PREMIUM,
                        0,
                        false,
                        false)));
        when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(actionWithGuruCost(3)));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(3).build()));
        when(entitlementService.getSnapshot(USER_ID)).thenReturn(activeEntitlement("ACTIVE"));
        when(ledgerRepository.countByUserIdAndModuleKeyAndActionKeyAndTransactionTypeSince(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(GuruLedger.TransactionType.GURU_SPENT), any(LocalDateTime.class)))
                .thenReturn(0L);

        FeatureAccessService.FeatureAccessResponse response = service.evaluateAccess(USER_ID, MODULE_KEY, ACTION_KEY);

        assertThat(response.allowed()).isTrue();
        assertThat(response.tokenCost()).isEqualTo(3);
        assertThat(response.premiumBehavior()).isEqualTo(ModuleMonetizationRule.PremiumBehavior.TOKEN_REQUIRED_EVEN_PREMIUM.name());
    }

    @Test
    void premiumActive_adFreeOnly_disablesRewardedFallbackButKeepsTokenRule() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, 3))
                .thenReturn(Optional.of(ruleWithPremium(
                        ModuleMonetizationRule.PremiumBehavior.AD_FREE_ONLY,
                        0,
                        false,
                        false)));
        when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(action()));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(0).build()));
        when(entitlementService.getSnapshot(USER_ID)).thenReturn(activeEntitlement("ACTIVE"));
        when(ledgerRepository.countByUserIdAndModuleKeyAndActionKeyAndTransactionTypeSince(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(GuruLedger.TransactionType.GURU_SPENT), any(LocalDateTime.class)))
                .thenReturn(0L);

        FeatureAccessService.FeatureAccessResponse response = service.evaluateAccess(USER_ID, MODULE_KEY, ACTION_KEY);

        assertThat(response.allowed()).isFalse();
        assertThat(response.rewardedAdAvailable()).isFalse();
        assertThat(response.tokenCost()).isEqualTo(1);
        assertThat(response.premiumApplied()).isTrue();
    }

    @Test
    void cancelledActiveWithFuturePeriod_isTreatedAsActivePremium() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, 3))
                .thenReturn(Optional.of(ruleWithPremium(
                        ModuleMonetizationRule.PremiumBehavior.UNLOCK_FREE,
                        0,
                        false,
                        false)));
        when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(action()));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(0).build()));
        when(entitlementService.getSnapshot(USER_ID)).thenReturn(activeEntitlement("CANCELLED_ACTIVE"));
        when(ledgerRepository.countByUserIdAndModuleKeyAndActionKeyAndTransactionTypeSince(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(GuruLedger.TransactionType.GURU_SPENT), any(LocalDateTime.class)))
                .thenReturn(0L);

        FeatureAccessService.FeatureAccessResponse response = service.evaluateAccess(USER_ID, MODULE_KEY, ACTION_KEY);

        assertThat(response.allowed()).isTrue();
        assertThat(response.requiresToken()).isFalse();
        assertThat(response.entitlementStatus()).isEqualTo("CANCELLED_ACTIVE");
    }

    @Test
    void expiredRevokedAndRefunded_entitlementsDoNotActivatePremiumRules() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings()));
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, 3))
                .thenReturn(Optional.of(ruleWithPremium(
                        ModuleMonetizationRule.PremiumBehavior.UNLOCK_FREE,
                        0,
                        false,
                        false)));
        when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(action()));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(1).build()));
        when(ledgerRepository.countByUserIdAndModuleKeyAndActionKeyAndTransactionTypeSince(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(GuruLedger.TransactionType.GURU_SPENT), any(LocalDateTime.class)))
                .thenReturn(0L);

        for (String status : new String[]{"EXPIRED", "REVOKED", "REFUNDED"}) {
            when(entitlementService.getSnapshot(USER_ID)).thenReturn(inactiveEntitlement(status));

            FeatureAccessService.FeatureAccessResponse response = service.evaluateAccess(USER_ID, MODULE_KEY, ACTION_KEY);

            assertThat(response.requiresToken()).as(status).isTrue();
            assertThat(response.premiumApplied()).as(status).isFalse();
        }
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

    private MonetizationAction actionWithGuruCost(int guruCost) {
        return MonetizationAction.builder()
                .actionKey(ACTION_KEY)
                .moduleKey(MODULE_KEY)
                .displayName("Compatibility View")
                .unlockType(MonetizationAction.UnlockType.GURU_SPEND)
                .guruCost(guruCost)
                .rewardAmount(1)
                .analyticsKey("COMPATIBILITY_VIEW")
                .isRewardFallbackEnabled(true)
                .isEnabled(true)
                .build();
    }

    private ModuleMonetizationRule ruleWithPremium(
            ModuleMonetizationRule.PremiumBehavior premiumBehavior,
            int premiumTokenCost,
            boolean premiumAdFree,
            boolean trialUnlockEnabled) {
        return ModuleMonetizationRule.builder()
                .moduleKey(MODULE_KEY)
                .isEnabled(true)
                .isAdsEnabled(true)
                .isGuruEnabled(true)
                .isGuruPurchaseEnabled(false)
                .rolloutStatus(ModuleMonetizationRule.RolloutStatus.ENABLED)
                .guruRewardAmountPerCompletedAd(1)
                .premiumBehavior(premiumBehavior)
                .premiumTokenCost(premiumTokenCost)
                .premiumAdFree(premiumAdFree)
                .trialUnlockEnabled(trialUnlockEnabled)
                .build();
    }

    private EntitlementService.EntitlementSnapshot noEntitlement() {
        return EntitlementService.EntitlementSnapshot.empty();
    }

    private EntitlementService.EntitlementSnapshot activeEntitlement(String status) {
        return new EntitlementService.EntitlementSnapshot(
                true,
                false,
                status,
                EntitlementService.DEFAULT_ENTITLEMENT_KEY,
                "premium_monthly",
                "REVENUECAT",
                "APP_STORE",
                null,
                null,
                null,
                null,
                true,
                null,
                null,
                null,
                java.util.List.of(EntitlementService.DEFAULT_ENTITLEMENT_KEY),
                0
        );
    }

    private EntitlementService.EntitlementSnapshot trialingEntitlement() {
        return new EntitlementService.EntitlementSnapshot(
                true,
                true,
                "TRIALING",
                EntitlementService.DEFAULT_ENTITLEMENT_KEY,
                "premium_monthly",
                "REVENUECAT",
                "APP_STORE",
                null,
                null,
                null,
                null,
                true,
                null,
                null,
                null,
                java.util.List.of(EntitlementService.DEFAULT_ENTITLEMENT_KEY),
                0
        );
    }

    private EntitlementService.EntitlementSnapshot inactiveEntitlement(String status) {
        return new EntitlementService.EntitlementSnapshot(
                false,
                false,
                status,
                EntitlementService.DEFAULT_ENTITLEMENT_KEY,
                "premium_monthly",
                "REVENUECAT",
                "APP_STORE",
                null,
                null,
                null,
                null,
                false,
                null,
                null,
                null,
                java.util.List.of(),
                0
        );
    }
}
