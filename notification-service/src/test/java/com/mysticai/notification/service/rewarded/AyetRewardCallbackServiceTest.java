package com.mysticai.notification.service.rewarded;

import com.mysticai.notification.config.AyetCallbackProperties;
import com.mysticai.notification.dto.rewarded.AyetCallbackParams;
import com.mysticai.notification.entity.monetization.*;
import com.mysticai.notification.repository.ProviderCallbackEventRepository;
import com.mysticai.notification.repository.RewardSessionRepository;
import com.mysticai.notification.service.monetization.GuruWalletService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Behavioural tests for the ayeT rewarded-video callback pipeline.
 *
 * Matches the repo's Mockito unit-test convention (no H2/Testcontainers in this
 * module). The DB-level concurrency guarantee (unique (provider, transaction_id)
 * + pessimistic session lock + unique ledger idempotency key) cannot be exercised
 * with live threads here; scenario 3 verifies the two structural safeguards:
 *   (a) a second sequential callback is short-circuited to DUPLICATE with no re-grant, and
 *   (b) a race that slips past the pre-check and hits the unique constraint is
 *       recovered as a clean DUPLICATE via the fresh-transaction replay path.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AyetRewardCallbackService — rewarded-video callback")
class AyetRewardCallbackServiceTest {

    @Mock RewardSessionRepository sessionRepository;
    @Mock ProviderCallbackEventRepository callbackEventRepository;
    @Mock GuruWalletService walletService;

    AyetRewardCallbackService service;
    AyetCallbackProperties props;

    static final Long USER_ID = 42L;
    static final String PLACEMENT = "TOKEN_WALLET_PLACEMENT";
    static final String ADSLOT = "ADSLOT_123";
    static final String CURRENCY = "Guru Token";

    @BeforeEach
    void setUp() {
        props = new AyetCallbackProperties();
        props.setRewardAmount(1);
        props.setExpectedCurrencyAmount(1);
        props.setPlacementIdentifier(PLACEMENT);
        props.setRewardedAdslotId(ADSLOT);
        props.setCurrencyIdentifier(CURRENCY);
        props.setSessionTtlSeconds(600);

        service = new AyetRewardCallbackService(
                sessionRepository,
                callbackEventRepository,
                walletService,
                props,
                new AyetSignatureVerifier(props),
                new SimpleMeterRegistry());
        // Self-reference: in prod this is a @Lazy proxy for @Transactional; in a unit
        // test we point it at the same instance so process/replay run directly.
        ReflectionTestUtils.setField(service, "self", service);

        when(callbackEventRepository.save(any(ProviderCallbackEvent.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(sessionRepository.save(any(RewardSession.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    // ── 1 ───────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("1: first valid callback grants exactly 1 token")
    void validCallback_grantsOneToken() {
        RewardSession session = createdSession();
        when(sessionRepository.findByIdForUpdate(session.getId())).thenReturn(Optional.of(session));
        when(callbackEventRepository.findByProviderAndProviderTransactionId(eq(RewardProvider.AYET), anyString()))
                .thenReturn(Optional.empty());
        when(walletService.earnProviderReward(eq(USER_ID), eq(1), eq("AYET"), anyString(), anyString(),
                anyString(), anyString(), anyString()))
                .thenReturn(ledger(1));

        var result = service.handle(params("txn-1", session.getId().toString(), 1, new BigDecimal("0.005")));

        assertThat(result.outcome()).isEqualTo(AyetRewardCallbackService.Outcome.PROCESSED);
        assertThat(result.code()).isEqualTo("OK");
        verify(walletService, times(1)).earnProviderReward(
                eq(USER_ID), eq(1), eq("AYET"), eq("txn-1"), eq(session.getId().toString()),
                eq(PLACEMENT), eq("ayet_rewarded_video_txn-1"), anyString());
        assertThat(session.getStatus()).isEqualTo(RewardSessionStatus.REWARDED);
    }

    // ── 2 ───────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("2: duplicate transaction_id does not grant a second token")
    void duplicateTransaction_noSecondGrant() {
        ProviderCallbackEvent processed = ProviderCallbackEvent.builder()
                .provider(RewardProvider.AYET).providerTransactionId("txn-dup")
                .status(ProviderCallbackEvent.CallbackStatus.PROCESSED).grantedAmount(1).build();
        when(callbackEventRepository.findByProviderAndProviderTransactionId(RewardProvider.AYET, "txn-dup"))
                .thenReturn(Optional.of(processed));

        var result = service.handle(params("txn-dup", UUID.randomUUID().toString(), 1, new BigDecimal("0.005")));

        assertThat(result.outcome()).isEqualTo(AyetRewardCallbackService.Outcome.DUPLICATE);
        assertThat(result.code()).isEqualTo("OK");
        verify(walletService, never()).earnProviderReward(any(), anyInt(), any(), any(), any(), any(), any(), any());
    }

    // ── 3 ───────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("3a: two sequential identical callbacks grant exactly once")
    void twoSequentialCallbacks_grantOnce() {
        RewardSession session = createdSession();
        when(sessionRepository.findByIdForUpdate(session.getId())).thenReturn(Optional.of(session));
        when(walletService.earnProviderReward(any(), anyInt(), any(), any(), any(), any(), any(), any()))
                .thenReturn(ledger(1));
        // 1st call: no event yet (pre + afterLock). 2nd call: winner's event present.
        ProviderCallbackEvent winner = ProviderCallbackEvent.builder()
                .provider(RewardProvider.AYET).providerTransactionId("txn-3")
                .status(ProviderCallbackEvent.CallbackStatus.PROCESSED).grantedAmount(1).build();
        when(callbackEventRepository.findByProviderAndProviderTransactionId(RewardProvider.AYET, "txn-3"))
                .thenReturn(Optional.empty())   // pre-check, call 1
                .thenReturn(Optional.empty())   // after-lock, call 1
                .thenReturn(Optional.of(winner)); // pre-check, call 2

        var first = service.handle(params("txn-3", session.getId().toString(), 1, new BigDecimal("0.005")));
        var second = service.handle(params("txn-3", session.getId().toString(), 1, new BigDecimal("0.005")));

        assertThat(first.outcome()).isEqualTo(AyetRewardCallbackService.Outcome.PROCESSED);
        assertThat(second.outcome()).isEqualTo(AyetRewardCallbackService.Outcome.DUPLICATE);
        verify(walletService, times(1)).earnProviderReward(any(), anyInt(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("3b: race hitting the unique constraint recovers as DUPLICATE")
    void raceConstraintViolation_recoversAsDuplicate() {
        RewardSession session = createdSession();
        when(sessionRepository.findByIdForUpdate(session.getId())).thenReturn(Optional.of(session));
        when(walletService.earnProviderReward(any(), anyInt(), any(), any(), any(), any(), any(), any()))
                .thenReturn(ledger(1));
        ProviderCallbackEvent winner = ProviderCallbackEvent.builder()
                .provider(RewardProvider.AYET).providerTransactionId("txn-race")
                .status(ProviderCallbackEvent.CallbackStatus.PROCESSED).grantedAmount(1).build();
        when(callbackEventRepository.findByProviderAndProviderTransactionId(RewardProvider.AYET, "txn-race"))
                .thenReturn(Optional.empty())    // pre-check
                .thenReturn(Optional.empty())    // after-lock
                .thenReturn(Optional.of(winner)); // replay lookup
        // The losing thread's PROCESSED insert violates uk_pce_provider_txn.
        when(callbackEventRepository.save(any(ProviderCallbackEvent.class)))
                .thenThrow(new DataIntegrityViolationException("uk_pce_provider_txn"));

        var result = service.handle(params("txn-race", session.getId().toString(), 1, new BigDecimal("0.005")));

        assertThat(result.outcome()).isEqualTo(AyetRewardCallbackService.Outcome.DUPLICATE);
    }

    // ── 4 ───────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("4: invalid external_identifier is rejected")
    void invalidExternalIdentifier_rejected() {
        when(callbackEventRepository.findByProviderAndProviderTransactionId(eq(RewardProvider.AYET), anyString()))
                .thenReturn(Optional.empty());

        var result = service.handle(params("txn-4", "not-a-uuid", 1, new BigDecimal("0.005")));

        assertThat(result.outcome()).isEqualTo(AyetRewardCallbackService.Outcome.REJECTED_BAD_REQUEST);
        assertThat(result.code()).isEqualTo("INVALID_EXTERNAL_IDENTIFIER");
        verify(walletService, never()).earnProviderReward(any(), anyInt(), any(), any(), any(), any(), any(), any());
    }

    // ── 5 ───────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("5: expired reward session is rejected")
    void expiredSession_rejected() {
        RewardSession session = createdSession();
        session.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        when(sessionRepository.findByIdForUpdate(session.getId())).thenReturn(Optional.of(session));
        when(callbackEventRepository.findByProviderAndProviderTransactionId(eq(RewardProvider.AYET), anyString()))
                .thenReturn(Optional.empty());

        var result = service.handle(params("txn-5", session.getId().toString(), 1, new BigDecimal("0.005")));

        assertThat(result.outcome()).isEqualTo(AyetRewardCallbackService.Outcome.REJECTED_BAD_REQUEST);
        assertThat(result.code()).isEqualTo("SESSION_EXPIRED");
        verify(walletService, never()).earnProviderReward(any(), anyInt(), any(), any(), any(), any(), any(), any());
    }

    // ── 6 ───────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("6: wrong adslot_id is rejected")
    void wrongAdslot_rejected() {
        when(callbackEventRepository.findByProviderAndProviderTransactionId(eq(RewardProvider.AYET), anyString()))
                .thenReturn(Optional.empty());

        AyetCallbackParams p = new AyetCallbackParams("txn-6", UUID.randomUUID().toString(), 1,
                new BigDecimal("0.005"), PLACEMENT, "WRONG_ADSLOT", CURRENCY, null, null, "1.2.3.4");
        var result = service.handle(p);

        assertThat(result.outcome()).isEqualTo(AyetRewardCallbackService.Outcome.REJECTED_FORBIDDEN);
        assertThat(result.code()).isEqualTo("BAD_ADSLOT");
        verify(walletService, never()).earnProviderReward(any(), anyInt(), any(), any(), any(), any(), any(), any());
    }

    // ── 7 ───────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("7: wrong placement_identifier is rejected")
    void wrongPlacement_rejected() {
        when(callbackEventRepository.findByProviderAndProviderTransactionId(eq(RewardProvider.AYET), anyString()))
                .thenReturn(Optional.empty());

        AyetCallbackParams p = new AyetCallbackParams("txn-7", UUID.randomUUID().toString(), 1,
                new BigDecimal("0.005"), "WRONG_PLACEMENT", ADSLOT, CURRENCY, null, null, "1.2.3.4");
        var result = service.handle(p);

        assertThat(result.outcome()).isEqualTo(AyetRewardCallbackService.Outcome.REJECTED_FORBIDDEN);
        assertThat(result.code()).isEqualTo("BAD_PLACEMENT");
        verify(walletService, never()).earnProviderReward(any(), anyInt(), any(), any(), any(), any(), any(), any());
    }

    // ── 8 ───────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("8: currency_amount != expected grants no token")
    void wrongCurrencyAmount_noToken() {
        when(callbackEventRepository.findByProviderAndProviderTransactionId(eq(RewardProvider.AYET), anyString()))
                .thenReturn(Optional.empty());

        var result = service.handle(params("txn-8", UUID.randomUUID().toString(), 2, new BigDecimal("0.005")));

        assertThat(result.outcome()).isEqualTo(AyetRewardCallbackService.Outcome.REJECTED_BAD_REQUEST);
        assertThat(result.code()).isEqualTo("BAD_CURRENCY_AMOUNT");
        verify(walletService, never()).earnProviderReward(any(), anyInt(), any(), any(), any(), any(), any(), any());
    }

    // ── 9 ───────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("9: payout_usd is recorded on the callback event")
    void payoutUsd_recorded() {
        RewardSession session = createdSession();
        when(sessionRepository.findByIdForUpdate(session.getId())).thenReturn(Optional.of(session));
        when(callbackEventRepository.findByProviderAndProviderTransactionId(eq(RewardProvider.AYET), anyString()))
                .thenReturn(Optional.empty());
        when(walletService.earnProviderReward(any(), anyInt(), any(), any(), any(), any(), any(), any()))
                .thenReturn(ledger(1));

        service.handle(params("txn-9", session.getId().toString(), 1, new BigDecimal("0.005")));

        ArgumentCaptor<ProviderCallbackEvent> captor = ArgumentCaptor.forClass(ProviderCallbackEvent.class);
        verify(callbackEventRepository).save(captor.capture());
        ProviderCallbackEvent saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(ProviderCallbackEvent.CallbackStatus.PROCESSED);
        assertThat(saved.getPayoutUsd()).isEqualByComparingTo(new BigDecimal("0.005"));
        assertThat(saved.getGrantedAmount()).isEqualTo(1);
    }

    // ── 10 ──────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("10: both processed and duplicate map to an OK outcome")
    void processedAndDuplicate_bothOk() {
        RewardSession session = createdSession();
        when(sessionRepository.findByIdForUpdate(session.getId())).thenReturn(Optional.of(session));
        when(walletService.earnProviderReward(any(), anyInt(), any(), any(), any(), any(), any(), any()))
                .thenReturn(ledger(1));
        ProviderCallbackEvent winner = ProviderCallbackEvent.builder()
                .provider(RewardProvider.AYET).providerTransactionId("txn-10")
                .status(ProviderCallbackEvent.CallbackStatus.PROCESSED).grantedAmount(1).build();
        when(callbackEventRepository.findByProviderAndProviderTransactionId(RewardProvider.AYET, "txn-10"))
                .thenReturn(Optional.empty()).thenReturn(Optional.empty())
                .thenReturn(Optional.of(winner));

        var processed = service.handle(params("txn-10", session.getId().toString(), 1, new BigDecimal("0.01")));
        var duplicate = service.handle(params("txn-10", session.getId().toString(), 1, new BigDecimal("0.01")));

        assertThat(processed.code()).isEqualTo("OK");
        assertThat(duplicate.code()).isEqualTo("OK");
        assertThat(processed.outcome()).isEqualTo(AyetRewardCallbackService.Outcome.PROCESSED);
        assertThat(duplicate.outcome()).isEqualTo(AyetRewardCallbackService.Outcome.DUPLICATE);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private RewardSession createdSession() {
        return RewardSession.builder()
                .id(UUID.randomUUID())
                .userId(USER_ID)
                .provider(RewardProvider.AYET)
                .channel(RewardChannel.WEB)
                .status(RewardSessionStatus.CREATED)
                .placement("TOKEN_WALLET")
                .rewardAmount(1)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .createdAt(LocalDateTime.now())
                .build();
    }

    private GuruLedger ledger(int amount) {
        return GuruLedger.builder()
                .id(UUID.randomUUID())
                .userId(USER_ID)
                .amount(amount)
                .balanceAfter(amount)
                .transactionType(GuruLedger.TransactionType.REWARDED_AD_AYET)
                .sourceType(GuruLedger.SourceType.REWARDED_AD)
                .build();
    }

    private AyetCallbackParams params(String txn, String external, int currencyAmount, BigDecimal payout) {
        return new AyetCallbackParams(txn, external, currencyAmount, payout,
                PLACEMENT, ADSLOT, CURRENCY, null, null, "1.2.3.4");
    }
}
