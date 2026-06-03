package com.mysticai.notification.service.monetization;

import com.mysticai.notification.entity.monetization.GuruWallet;
import com.mysticai.notification.entity.monetization.ModuleMonetizationRule;
import com.mysticai.notification.entity.monetization.MonetizationAction;
import com.mysticai.notification.entity.monetization.MonetizationSettings;
import com.mysticai.notification.entity.monetization.RewardedUnlockEvent;
import com.mysticai.notification.entity.monetization.RewardedUnlockProgress;
import com.mysticai.notification.repository.GuruWalletRepository;
import com.mysticai.notification.repository.ModuleMonetizationRuleRepository;
import com.mysticai.notification.repository.MonetizationActionRepository;
import com.mysticai.notification.repository.MonetizationSettingsRepository;
import com.mysticai.notification.repository.RewardedUnlockEventRepository;
import com.mysticai.notification.repository.RewardedUnlockProgressRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RewardedContentUnlockServiceTest {

    private static final Long USER_ID = 42L;
    private static final String MODULE_KEY = "horoscope";
    private static final String ACTION_KEY = "weekly";
    private static final int CONFIG_VERSION = 7;

    @Mock MonetizationSettingsRepository settingsRepository;
    @Mock ModuleMonetizationRuleRepository ruleRepository;
    @Mock MonetizationActionRepository actionRepository;
    @Mock GuruWalletRepository walletRepository;
    @Mock FeatureAccessService featureAccessService;
    @Mock RewardedUnlockProgressRepository progressRepository;
    @Mock RewardedUnlockEventRepository eventRepository;

    @InjectMocks RewardedContentUnlockService service;

    @BeforeEach
    void setUp() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
                .thenReturn(Optional.of(settings()));
        lenient().when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(action(2)));
        lenient().when(walletRepository.findByUserIdForUpdate(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(0).build()));
    }

    @Test
    void unlockOptions_usesActionGuruCostForTokenRequirementAndDefaultAdViews() {
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, CONFIG_VERSION))
                .thenReturn(Optional.of(rule(null)));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(6).build()));
        when(progressRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), isNull(), eq(RewardedUnlockProgress.Status.IN_PROGRESS), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());

        RewardedContentUnlockService.UnlockOptionsResponse response =
                service.getUnlockOptions(USER_ID, MODULE_KEY, ACTION_KEY);

        assertThat(response.tokenRequirement()).isEqualTo(2);
        assertThat(response.userGuruBalance()).isEqualTo(6);
        assertThat(response.rewardedAdViewsRequired()).isEqualTo(2);
        assertThat(response.rewardedAdProgress().required()).isEqualTo(2);
        assertThat(response.adAvailability().allowed()).isTrue();
    }

    @Test
    void unlockOptions_usesRewardedAdViewsOverrideWhenPresent() {
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, CONFIG_VERSION))
                .thenReturn(Optional.of(rule(1)));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(6).build()));
        when(progressRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), isNull(), eq(RewardedUnlockProgress.Status.IN_PROGRESS), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());

        RewardedContentUnlockService.UnlockOptionsResponse response =
                service.getUnlockOptions(USER_ID, MODULE_KEY, ACTION_KEY);

        assertThat(response.tokenRequirement()).isEqualTo(2);
        assertThat(response.rewardedAdViewsRequired()).isEqualTo(1);
        assertThat(response.rewardedAdProgress().required()).isEqualTo(1);
    }

    @Test
    void unlockOptions_allowsRewardedAdForGuruSpendActionsWithRewardFallback() {
        when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(guruSpendRewardFallbackAction()));
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, CONFIG_VERSION))
                .thenReturn(Optional.of(rule(null)));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(6).build()));
        when(progressRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), isNull(), eq(RewardedUnlockProgress.Status.IN_PROGRESS), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());

        RewardedContentUnlockService.UnlockOptionsResponse response =
                service.getUnlockOptions(USER_ID, MODULE_KEY, ACTION_KEY);

        assertThat(response.tokenUnlockEnabled()).isTrue();
        assertThat(response.rewardedAdEnabled()).isTrue();
        assertThat(response.rewardedAdViewsRequired()).isEqualTo(2);
    }

    @Test
    void unlockOptions_usesContentKeyScopedProgress() {
        String contentKey = "horoscope:weekly:gemini:2026-W21";
        RewardedUnlockProgress progress = RewardedUnlockProgress.builder()
                .userId(USER_ID)
                .moduleKey(MODULE_KEY)
                .actionKey(ACTION_KEY)
                .contentKey(contentKey)
                .requiredViews(2)
                .completedViews(1)
                .status(RewardedUnlockProgress.Status.IN_PROGRESS)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();

        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, CONFIG_VERSION))
                .thenReturn(Optional.of(rule(null)));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(6).build()));
        when(progressRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(contentKey), eq(RewardedUnlockProgress.Status.IN_PROGRESS), any(LocalDateTime.class)))
                .thenReturn(Optional.of(progress));

        RewardedContentUnlockService.UnlockOptionsResponse response =
                service.getUnlockOptions(USER_ID, MODULE_KEY, ACTION_KEY, contentKey);

        assertThat(response.contentKey()).isEqualTo(contentKey);
        assertThat(response.rewardedAdProgress().completed()).isEqualTo(1);
        assertThat(response.rewardedAdProgress().required()).isEqualTo(2);
    }

    @Test
    void unlockOptions_marksContentAsAlreadyUnlockedWhenProgressIsActive() {
        String contentKey = "horoscope:daily:capricorn:2026-06-03";
        RewardedUnlockProgress unlockedProgress = RewardedUnlockProgress.builder()
                .userId(USER_ID)
                .moduleKey(MODULE_KEY)
                .actionKey(ACTION_KEY)
                .contentKey(contentKey)
                .requiredViews(0)
                .completedViews(0)
                .status(RewardedUnlockProgress.Status.UNLOCKED)
                .unlockedAt(LocalDateTime.now().minusMinutes(5))
                .expiresAt(LocalDateTime.now().plusHours(20))
                .build();

        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, CONFIG_VERSION))
                .thenReturn(Optional.of(rule(null)));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(6).build()));
        when(progressRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(contentKey), eq(RewardedUnlockProgress.Status.IN_PROGRESS), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());
        when(progressRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByUnlockedAtDesc(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(contentKey), eq(RewardedUnlockProgress.Status.UNLOCKED), any(LocalDateTime.class)))
                .thenReturn(Optional.of(unlockedProgress));

        RewardedContentUnlockService.UnlockOptionsResponse response =
                service.getUnlockOptions(USER_ID, MODULE_KEY, ACTION_KEY, contentKey);

        assertThat(response.contentKey()).isEqualTo(contentKey);
        assertThat(response.alreadyUnlocked()).isTrue();
    }

    @Test
    void unlockOptions_normalizesZeroGuruCostToOneTokenRequirement() {
        when(actionRepository.findByActionKeyAndModuleKey(ACTION_KEY, MODULE_KEY))
                .thenReturn(Optional.of(action(0)));
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, CONFIG_VERSION))
                .thenReturn(Optional.of(rule(null)));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(6).build()));
        when(progressRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), isNull(), eq(RewardedUnlockProgress.Status.IN_PROGRESS), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());

        RewardedContentUnlockService.UnlockOptionsResponse response =
                service.getUnlockOptions(USER_ID, MODULE_KEY, ACTION_KEY);

        assertThat(response.tokenRequirement()).isEqualTo(1);
        assertThat(response.rewardedAdViewsRequired()).isEqualTo(1);
    }

    @Test
    void completeRewardedAd_requiresAllViewsBeforeUnlocking() {
        AtomicReference<RewardedUnlockProgress> activeProgress = new AtomicReference<>();
        UUID progressId = UUID.randomUUID();

        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, CONFIG_VERSION))
                .thenReturn(Optional.of(rule(null)));
        when(progressRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), isNull(), eq(RewardedUnlockProgress.Status.IN_PROGRESS), any(LocalDateTime.class)))
                .thenAnswer(invocation -> Optional.ofNullable(activeProgress.get())
                        .filter(progress -> progress.getStatus() == RewardedUnlockProgress.Status.IN_PROGRESS));
        when(progressRepository.save(any(RewardedUnlockProgress.class))).thenAnswer(invocation -> {
            RewardedUnlockProgress progress = invocation.getArgument(0);
            if (progress.getId() == null) {
                progress.setId(progressId);
            }
            activeProgress.set(progress);
            return progress;
        });
        when(eventRepository.save(any(RewardedUnlockEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RewardedContentUnlockService.RewardedAdCompleteResponse first =
                service.completeRewardedAd(USER_ID, MODULE_KEY, ACTION_KEY, completeRequest("client-1", "tx-1"));
        RewardedContentUnlockService.RewardedAdCompleteResponse second =
                service.completeRewardedAd(USER_ID, MODULE_KEY, ACTION_KEY, completeRequest("client-2", "tx-2"));

        assertThat(first.completedViews()).isEqualTo(1);
        assertThat(first.unlocked()).isFalse();
        assertThat(first.remainingViews()).isEqualTo(1);
        assertThat(second.completedViews()).isEqualTo(2);
        assertThat(second.unlocked()).isTrue();
        assertThat(second.unlockId()).isEqualTo(progressId.toString());
    }

    @Test
    void completeRewardedAd_replaysDuplicateClientEventWithoutIncrementing() {
        UUID progressId = UUID.randomUUID();
        RewardedUnlockProgress progress = RewardedUnlockProgress.builder()
                .id(progressId)
                .userId(USER_ID)
                .moduleKey(MODULE_KEY)
                .actionKey(ACTION_KEY)
                .requiredViews(2)
                .completedViews(1)
                .status(RewardedUnlockProgress.Status.IN_PROGRESS)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();
        RewardedUnlockEvent event = RewardedUnlockEvent.builder()
                .progressId(progressId)
                .userId(USER_ID)
                .moduleKey(MODULE_KEY)
                .actionKey(ACTION_KEY)
                .clientEventId("client-dup")
                .transactionId("tx-dup")
                .eventType(RewardedUnlockEvent.EventType.AD_COMPLETED)
                .build();

        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, CONFIG_VERSION))
                .thenReturn(Optional.of(rule(null)));
        when(eventRepository.findByClientEventId("client-dup")).thenReturn(Optional.of(event));
        when(progressRepository.findById(progressId)).thenReturn(Optional.of(progress));

        RewardedContentUnlockService.RewardedAdCompleteResponse response =
                service.completeRewardedAd(USER_ID, MODULE_KEY, ACTION_KEY, completeRequest("client-dup", "tx-dup"));

        assertThat(response.idempotentReplay()).isTrue();
        assertThat(response.completedViews()).isEqualTo(1);
        assertThat(response.unlocked()).isFalse();
        verify(eventRepository, never()).save(any(RewardedUnlockEvent.class));
        verify(progressRepository, never()).save(any(RewardedUnlockProgress.class));
    }

    @Test
    void completeRewardedAd_allowsBlankTransactionIdAndUsesClientEventIdForIdempotency() {
        UUID progressId = UUID.randomUUID();
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, CONFIG_VERSION))
                .thenReturn(Optional.of(rule(1)));
        when(progressRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), isNull(), eq(RewardedUnlockProgress.Status.IN_PROGRESS), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());
        when(progressRepository.save(any(RewardedUnlockProgress.class))).thenAnswer(invocation -> {
            RewardedUnlockProgress progress = invocation.getArgument(0);
            if (progress.getId() == null) {
                progress.setId(progressId);
            }
            return progress;
        });
        when(eventRepository.save(any(RewardedUnlockEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RewardedContentUnlockService.RewardedAdCompleteResponse response =
                service.completeRewardedAd(USER_ID, MODULE_KEY, ACTION_KEY, completeRequest("client-null-tx", " "));

        assertThat(response.unlocked()).isTrue();
        assertThat(response.completedViews()).isEqualTo(1);
        verify(eventRepository, never()).findByTransactionId(any());
    }

    @Test
    void completeRewardedAd_persistsContentKeyOnProgressAndEvent() {
        String contentKey = "dream:monthly_story:2026-05";
        UUID progressId = UUID.randomUUID();

        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, CONFIG_VERSION))
                .thenReturn(Optional.of(rule(1)));
        when(progressRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(contentKey), eq(RewardedUnlockProgress.Status.IN_PROGRESS), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());
        when(progressRepository.save(any(RewardedUnlockProgress.class))).thenAnswer(invocation -> {
            RewardedUnlockProgress progress = invocation.getArgument(0);
            if (progress.getId() == null) {
                progress.setId(progressId);
            }
            return progress;
        });
        when(eventRepository.save(any(RewardedUnlockEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.completeRewardedAd(
                USER_ID,
                MODULE_KEY,
                ACTION_KEY,
                new RewardedContentUnlockService.RewardedAdCompleteRequest(
                        "admob",
                        MODULE_KEY + "_" + ACTION_KEY + "_unlock",
                        "tx-content",
                        "client-content",
                        contentKey
                )
        );

        ArgumentCaptor<RewardedUnlockProgress> progressCaptor = ArgumentCaptor.forClass(RewardedUnlockProgress.class);
        ArgumentCaptor<RewardedUnlockEvent> eventCaptor = ArgumentCaptor.forClass(RewardedUnlockEvent.class);
        verify(progressRepository, atLeastOnce()).save(progressCaptor.capture());
        verify(eventRepository).save(eventCaptor.capture());
        assertThat(progressCaptor.getAllValues())
                .extracting(RewardedUnlockProgress::getContentKey)
                .containsOnly(contentKey);
        assertThat(eventCaptor.getValue().getContentKey()).isEqualTo(contentKey);
    }

    @Test
    void checkRewardedAd_blocksWhenHourlyWindowLimitReached() {
        RewardedUnlockEvent oldest = completedEvent(LocalDateTime.now().minusMinutes(50));
        RewardedUnlockEvent latest = completedEvent(LocalDateTime.now().minusMinutes(5));

        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, CONFIG_VERSION))
                .thenReturn(Optional.of(rule(null)));
        when(progressRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), isNull(), eq(RewardedUnlockProgress.Status.IN_PROGRESS), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());
        when(eventRepository.countCompletedSince(eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), any(LocalDateTime.class)))
                .thenReturn(0L, 3L);
        when(eventRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndEventTypeAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(RewardedUnlockEvent.EventType.AD_COMPLETED), any(LocalDateTime.class)))
                .thenReturn(Optional.of(oldest));
        when(eventRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndEventTypeAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), eq(RewardedUnlockEvent.EventType.AD_COMPLETED), any(LocalDateTime.class)))
                .thenReturn(Optional.of(latest));

        RewardedContentUnlockService.RewardedAdCheckResponse response =
                service.checkRewardedAd(USER_ID, MODULE_KEY, ACTION_KEY);

        assertThat(response.allowed()).isFalse();
        assertThat(response.reason()).isEqualTo("HOURLY_LIMIT_REACHED");
        assertThat(response.retryAfterSeconds()).isPositive();
        assertThat(response.message()).contains("Reklam izleme kapasiten doldu.");
    }

    @Test
    void checkRewardedAd_blocksWhenDailyLimitReached() {
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, CONFIG_VERSION))
                .thenReturn(Optional.of(rule(null)));
        when(progressRepository.findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
                eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), isNull(), eq(RewardedUnlockProgress.Status.IN_PROGRESS), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());
        when(eventRepository.countCompletedSince(eq(USER_ID), eq(MODULE_KEY), eq(ACTION_KEY), any(LocalDateTime.class)))
                .thenReturn(10L);

        RewardedContentUnlockService.RewardedAdCheckResponse response =
                service.checkRewardedAd(USER_ID, MODULE_KEY, ACTION_KEY);

        assertThat(response.allowed()).isFalse();
        assertThat(response.reason()).isEqualTo("DAILY_LIMIT_REACHED");
        assertThat(response.retryAfterSeconds()).isPositive();
        assertThat(response.message()).contains("Reklam izleme kapasiten doldu.");
    }

    @Test
    void unlockWithToken_failsWhenBalanceIsInsufficient() {
        when(ruleRepository.findByModuleKeyAndConfigVersion(MODULE_KEY, CONFIG_VERSION))
                .thenReturn(Optional.of(rule(null)));
        when(walletRepository.findByUserId(USER_ID))
                .thenReturn(Optional.of(GuruWallet.builder().userId(USER_ID).currentBalance(1).build()));

        RewardedContentUnlockService.TokenUnlockResponse response =
                service.unlockWithToken(USER_ID, MODULE_KEY, ACTION_KEY, null);

        assertThat(response.unlocked()).isFalse();
        assertThat(response.reason()).isEqualTo("INSUFFICIENT_GURU");
        assertThat(response.message()).contains("Yeterli Guru Token yok");
        verify(featureAccessService, never()).consumeAccess(any(), any(), any(), any(), any(), any(), any(), any());
    }

    private MonetizationSettings settings() {
        return MonetizationSettings.builder()
                .settingsKey("default")
                .isEnabled(true)
                .isAdsEnabled(true)
                .isGuruEnabled(true)
                .configVersion(CONFIG_VERSION)
                .status(MonetizationSettings.Status.PUBLISHED)
                .build();
    }

    private ModuleMonetizationRule rule(Integer rewardedAdViewsRequired) {
        return ModuleMonetizationRule.builder()
                .moduleKey(MODULE_KEY)
                .isEnabled(true)
                .isAdsEnabled(true)
                .isGuruEnabled(true)
                .rolloutStatus(ModuleMonetizationRule.RolloutStatus.ENABLED)
                .rewardedAdEnabled(true)
                .rewardedAdViewsRequired(rewardedAdViewsRequired)
                .rewardedAdHourlyLimit(3)
                .rewardedAdDailyLimit(10)
                .rewardedAdCooldownMinutes(60)
                .rewardedAdWindowMinutes(60)
                .build();
    }

    private MonetizationAction action(int guruCost) {
        return MonetizationAction.builder()
                .actionKey(ACTION_KEY)
                .moduleKey(MODULE_KEY)
                .displayName("Weekly Horoscope")
                .unlockType(MonetizationAction.UnlockType.AD_OR_GURU)
                .guruCost(guruCost)
                .isRewardFallbackEnabled(true)
                .isEnabled(true)
                .build();
    }

    private MonetizationAction guruSpendRewardFallbackAction() {
        return MonetizationAction.builder()
                .actionKey(ACTION_KEY)
                .moduleKey(MODULE_KEY)
                .displayName("Weekly Horoscope")
                .unlockType(MonetizationAction.UnlockType.GURU_SPEND)
                .guruCost(2)
                .rewardAmount(1)
                .isRewardFallbackEnabled(true)
                .isEnabled(true)
                .build();
    }

    private RewardedContentUnlockService.RewardedAdCompleteRequest completeRequest(String clientEventId, String transactionId) {
        return new RewardedContentUnlockService.RewardedAdCompleteRequest(
                "admob",
                MODULE_KEY + "_" + ACTION_KEY + "_unlock",
                transactionId,
                clientEventId,
                null
        );
    }

    private RewardedUnlockEvent completedEvent(LocalDateTime createdAt) {
        RewardedUnlockEvent event = RewardedUnlockEvent.builder()
                .progressId(UUID.randomUUID())
                .userId(USER_ID)
                .moduleKey(MODULE_KEY)
                .actionKey(ACTION_KEY)
                .clientEventId(UUID.randomUUID().toString())
                .eventType(RewardedUnlockEvent.EventType.AD_COMPLETED)
                .build();
        event.setCreatedAt(createdAt);
        return event;
    }
}
