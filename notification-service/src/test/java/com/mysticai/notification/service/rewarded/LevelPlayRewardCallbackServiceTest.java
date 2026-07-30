package com.mysticai.notification.service.rewarded;

import com.mysticai.notification.config.LevelPlayCallbackProperties;
import com.mysticai.notification.dto.rewarded.LevelPlayCallbackParams;
import com.mysticai.notification.entity.monetization.ProviderCallbackEvent;
import com.mysticai.notification.entity.monetization.RewardChannel;
import com.mysticai.notification.entity.monetization.RewardProvider;
import com.mysticai.notification.entity.monetization.RewardSession;
import com.mysticai.notification.entity.monetization.RewardSessionStatus;
import com.mysticai.notification.repository.ProviderCallbackEventRepository;
import com.mysticai.notification.repository.RewardSessionRepository;
import com.mysticai.notification.service.monetization.GuruWalletService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

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

@ExtendWith(MockitoExtension.class)
class LevelPlayRewardCallbackServiceTest {

    @Mock RewardSessionRepository sessionRepository;
    @Mock ProviderCallbackEventRepository eventRepository;
    @Mock GuruWalletService walletService;
    @Mock LevelPlaySignatureVerifier signatureVerifier;

    private LevelPlayRewardCallbackService service;
    private final LevelPlayCallbackProperties properties = new LevelPlayCallbackProperties();

    @BeforeEach
    void setUp() {
        properties.setRewardAmount(1);
        properties.setExpectedRewardAmount(1);
        service = new LevelPlayRewardCallbackService(
                sessionRepository, eventRepository, walletService, properties, signatureVerifier);
        ReflectionTestUtils.setField(service, "self", service);
    }

    @Test
    void validCallbackCreditsExactlyOneServerOwnedToken() {
        RewardSession session = createdSession();
        when(signatureVerifier.verify(any())).thenReturn(true);
        when(eventRepository.findByProviderAndProviderTransactionId(RewardProvider.LEVELPLAY, "event-1"))
                .thenReturn(Optional.empty());
        when(sessionRepository.findByIdForUpdate(session.getId())).thenReturn(Optional.of(session));
        when(eventRepository.save(any(ProviderCallbackEvent.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionRepository.save(any(RewardSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.handle(params("event-1", session.getId(), "42", 1));

        assertThat(result.outcome()).isEqualTo(LevelPlayRewardCallbackService.Outcome.PROCESSED);
        assertThat(session.getStatus()).isEqualTo(RewardSessionStatus.REWARDED);
        verify(walletService).earnProviderReward(
                eq(42L), eq(1), eq("LEVELPLAY"), eq("event-1"),
                eq(session.getId().toString()), eq("TOKEN_WALLET"),
                eq("levelplay_rewarded_event-1"), anyString());
    }

    @Test
    void replayedEventReturnsOkWithoutSecondCredit() {
        ProviderCallbackEvent processed = ProviderCallbackEvent.builder()
                .provider(RewardProvider.LEVELPLAY)
                .providerTransactionId("event-duplicate")
                .status(ProviderCallbackEvent.CallbackStatus.PROCESSED)
                .build();
        when(signatureVerifier.verify(any())).thenReturn(true);
        when(eventRepository.findByProviderAndProviderTransactionId(
                RewardProvider.LEVELPLAY, "event-duplicate")).thenReturn(Optional.of(processed));

        var result = service.handle(params("event-duplicate", UUID.randomUUID(), "42", 1));

        assertThat(result.outcome()).isEqualTo(LevelPlayRewardCallbackService.Outcome.DUPLICATE);
        assertThat(result.code()).isEqualTo("OK");
        verify(walletService, never()).earnProviderReward(
                any(), anyInt(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void badSignatureNeverTouchesRewardState() {
        when(signatureVerifier.verify(any())).thenReturn(false);

        var result = service.handle(params("event-bad-signature", UUID.randomUUID(), "42", 1));

        assertThat(result.outcome()).isEqualTo(LevelPlayRewardCallbackService.Outcome.FORBIDDEN);
        verify(eventRepository, never()).save(any());
        verify(walletService, never()).earnProviderReward(
                any(), anyInt(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void expiredSessionAndWrongRewardAreRejectedWithoutCredit() {
        RewardSession expired = createdSession();
        expired.setExpiresAt(LocalDateTime.now().minusSeconds(1));
        when(signatureVerifier.verify(any())).thenReturn(true);
        when(eventRepository.findByProviderAndProviderTransactionId(
                eq(RewardProvider.LEVELPLAY), anyString())).thenReturn(Optional.empty());
        when(sessionRepository.findByIdForUpdate(expired.getId())).thenReturn(Optional.of(expired));
        when(eventRepository.save(any(ProviderCallbackEvent.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionRepository.save(any(RewardSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var expiredResult = service.handle(params("event-expired", expired.getId(), "42", 1));
        var amountResult = service.handle(params("event-wrong-amount", UUID.randomUUID(), "42", 99));

        assertThat(expiredResult.code()).isEqualTo("SESSION_EXPIRED");
        assertThat(amountResult.code()).isEqualTo("BAD_REWARD_AMOUNT");
        verify(walletService, never()).earnProviderReward(
                any(), anyInt(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void oneSessionCannotRewardASecondCallback() {
        RewardSession used = createdSession();
        used.setStatus(RewardSessionStatus.REWARDED);
        when(signatureVerifier.verify(any())).thenReturn(true);
        when(eventRepository.findByProviderAndProviderTransactionId(
                eq(RewardProvider.LEVELPLAY), anyString())).thenReturn(Optional.empty());
        when(sessionRepository.findByIdForUpdate(used.getId())).thenReturn(Optional.of(used));

        var result = service.handle(params("event-second", used.getId(), "42", 1));

        assertThat(result.outcome()).isEqualTo(LevelPlayRewardCallbackService.Outcome.DUPLICATE);
        verify(walletService, never()).earnProviderReward(
                any(), anyInt(), any(), any(), any(), any(), any(), any());
    }

    private static RewardSession createdSession() {
        return RewardSession.builder()
                .id(UUID.randomUUID())
                .userId(42L)
                .provider(RewardProvider.LEVELPLAY)
                .channel(RewardChannel.MOBILE)
                .status(RewardSessionStatus.CREATED)
                .placement("TOKEN_WALLET")
                .rewardAmount(1)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build();
    }

    private static LevelPlayCallbackParams params(
            String eventId, UUID sessionId, String userId, int rewards) {
        return new LevelPlayCallbackParams(
                "1700000000", eventId, userId, rewards, "signature",
                sessionId.toString(), "TOKEN_WALLET", "UnityAds", "auction-1");
    }
}
