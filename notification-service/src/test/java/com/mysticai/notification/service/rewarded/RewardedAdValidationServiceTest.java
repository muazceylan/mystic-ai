package com.mysticai.notification.service.rewarded;

import com.mysticai.notification.entity.monetization.*;
import com.mysticai.notification.repository.RewardIntentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RewardedAdValidationService — unit tests")
class RewardedAdValidationServiceTest {

    @Mock
    private RewardIntentRepository intentRepository;

    @InjectMocks
    private RewardedAdValidationService validationService;

    private static final Long USER_ID = 42L;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(validationService, "dailyLimit", 10);
        ReflectionTestUtils.setField(validationService, "hourlyLimit", 3);
        ReflectionTestUtils.setField(validationService, "maxParallelPendingIntents", 1);
        ReflectionTestUtils.setField(validationService, "cooldownSeconds", 60);
    }

    // ── validateCanCreateIntent ─────────────────────────────────────────────

    @Test
    @DisplayName("validateCanCreateIntent — passes when no active intents and under limits")
    void validateCanCreateIntent_passes() {
        when(intentRepository.countActiveIntents(eq(USER_ID), any())).thenReturn(0L);
        when(intentRepository.countClaimedToday(eq(USER_ID), any())).thenReturn(0L);
        when(intentRepository.countClaimedSince(eq(USER_ID), any())).thenReturn(0L);

        assertThatNoException()
            .isThrownBy(() -> validationService.validateCanCreateIntent(USER_ID));
    }

    @Test
    @DisplayName("validateCanCreateIntent — blocked when too many active intents")
    void validateCanCreateIntent_tooManyActive() {
        when(intentRepository.countActiveIntents(eq(USER_ID), any())).thenReturn(1L);

        assertThatThrownBy(() -> validationService.validateCanCreateIntent(USER_ID))
            .isInstanceOf(RewardedAdValidationService.RewardValidationException.class)
            .extracting("code").isEqualTo("TOO_MANY_ACTIVE_INTENTS");
    }

    @Test
    @DisplayName("validateCanCreateIntent — blocked when daily cap reached")
    void validateCanCreateIntent_dailyCap() {
        when(intentRepository.countActiveIntents(eq(USER_ID), any())).thenReturn(0L);
        when(intentRepository.countClaimedToday(eq(USER_ID), any())).thenReturn(10L);

        assertThatThrownBy(() -> validationService.validateCanCreateIntent(USER_ID))
            .isInstanceOf(RewardedAdValidationService.RewardValidationException.class)
            .extracting("code").isEqualTo("DAILY_CAP_REACHED");
    }

    @Test
    @DisplayName("validateCanCreateIntent — blocked when hourly cap reached")
    void validateCanCreateIntent_hourlyCap() {
        when(intentRepository.countActiveIntents(eq(USER_ID), any())).thenReturn(0L);
        when(intentRepository.countClaimedToday(eq(USER_ID), any())).thenReturn(2L);
        when(intentRepository.countClaimedSince(eq(USER_ID), any()))
            .thenReturn(3L)     // hourly check
            .thenReturn(0L);    // cooldown check (shouldn't reach)

        assertThatThrownBy(() -> validationService.validateCanCreateIntent(USER_ID))
            .isInstanceOf(RewardedAdValidationService.RewardValidationException.class)
            .extracting("code").isEqualTo("HOURLY_CAP_REACHED");
    }

    @Test
    @DisplayName("validateCanCreateIntent — blocked during cooldown period")
    void validateCanCreateIntent_cooldown() {
        when(intentRepository.countActiveIntents(eq(USER_ID), any())).thenReturn(0L);
        when(intentRepository.countClaimedToday(eq(USER_ID), any())).thenReturn(1L);
        when(intentRepository.countClaimedSince(eq(USER_ID), any()))
            .thenReturn(0L)     // hourly check passes
            .thenReturn(1L);    // cooldown check hits

        assertThatThrownBy(() -> validationService.validateCanCreateIntent(USER_ID))
            .isInstanceOf(RewardedAdValidationService.RewardValidationException.class)
            .extracting("code").isEqualTo("COOLDOWN_ACTIVE");
    }

    // ── validateCanClaim ───────────────────────────────────────────────────

    @Test
    @DisplayName("validateCanClaim — passes for valid GRANTED intent")
    void validateCanClaim_passes() {
        RewardIntent intent = buildIntent(RewardIntentStatus.GRANTED, false);
        assertThatNoException()
            .isThrownBy(() -> validationService.validateCanClaim(intent, USER_ID, "session1"));
    }

    @Test
    @DisplayName("validateCanClaim — rejects ownership mismatch")
    void validateCanClaim_ownershipMismatch() {
        RewardIntent intent = buildIntent(RewardIntentStatus.GRANTED, false);

        assertThatThrownBy(() -> validationService.validateCanClaim(intent, 999L, "session1"))
            .isInstanceOf(RewardedAdValidationService.RewardValidationException.class)
            .extracting("code").isEqualTo("OWNERSHIP_MISMATCH");
    }

    @Test
    @DisplayName("validateCanClaim — rejects expired intent")
    void validateCanClaim_expired() {
        RewardIntent intent = buildIntent(RewardIntentStatus.GRANTED, true); // expired

        assertThatThrownBy(() -> validationService.validateCanClaim(intent, USER_ID, "session1"))
            .isInstanceOf(RewardedAdValidationService.RewardValidationException.class)
            .extracting("code").isEqualTo("INTENT_EXPIRED");
    }

    @Test
    @DisplayName("validateCanClaim — rejects already claimed intent")
    void validateCanClaim_alreadyClaimed() {
        RewardIntent intent = buildIntent(RewardIntentStatus.CLAIMED, false);

        assertThatThrownBy(() -> validationService.validateCanClaim(intent, USER_ID, "session1"))
            .isInstanceOf(RewardedAdValidationService.RewardValidationException.class)
            .extracting("code").isEqualTo("ALREADY_CLAIMED");
    }

    @Test
    @DisplayName("validateCanClaim — rejects session replay")
    void validateCanClaim_sessionReplay() {
        RewardIntent intent = buildIntent(RewardIntentStatus.GRANTED, false);
        when(intentRepository.existsByUserIdAndAdSessionIdAndStatus(
            eq(USER_ID), eq("reusedSession"), eq(RewardIntentStatus.CLAIMED)))
            .thenReturn(true);

        assertThatThrownBy(() -> validationService.validateCanClaim(intent, USER_ID, "reusedSession"))
            .isInstanceOf(RewardedAdValidationService.RewardValidationException.class)
            .extracting("code").isEqualTo("SESSION_REPLAY");
    }

    @Test
    @DisplayName("validateCanClaim — accepts PENDING status (mark-ready is now telemetry-only)")
    void validateCanClaim_pendingStatusNowAccepted() {
        // WHY: V2 demoted mark-ready to telemetry. PENDING → CLAIMED is valid.
        // The old INVALID_STATE rejection for PENDING is removed.
        RewardIntent intent = buildIntent(RewardIntentStatus.PENDING, false);
        assertThatNoException()
            .isThrownBy(() -> validationService.validateCanClaim(intent, USER_ID, "session1"));
    }

    @Test
    @DisplayName("validateCanClaim — rejects truly terminal status (FAILED)")
    void validateCanClaim_terminalFailed() {
        RewardIntent intent = buildIntent(RewardIntentStatus.FAILED, false);

        assertThatThrownBy(() -> validationService.validateCanClaim(intent, USER_ID, "session1"))
            .isInstanceOf(RewardedAdValidationService.RewardValidationException.class)
            .extracting("code").isEqualTo("INTENT_TERMINAL");
    }

    @Test
    @DisplayName("validateCanClaim — rejects CANCELLED status")
    void validateCanClaim_terminalCancelled() {
        RewardIntent intent = buildIntent(RewardIntentStatus.CANCELLED, false);

        assertThatThrownBy(() -> validationService.validateCanClaim(intent, USER_ID, "session1"))
            .isInstanceOf(RewardedAdValidationService.RewardValidationException.class)
            .extracting("code").isEqualTo("INTENT_TERMINAL");
    }

    // ── helpers ────────────────────────────────────────────────────────────

    private RewardIntent buildIntent(RewardIntentStatus status, boolean expired) {
        return RewardIntent.builder()
            .id(UUID.randomUUID())
            .userId(USER_ID)
            .status(status)
            .source(RewardClaimSource.WEB_REWARDED_AD)
            .rewardAmount(5)
            .rewardType("GURU_TOKEN")
            .expiresAt(expired
                ? LocalDateTime.now().minusMinutes(10)
                : LocalDateTime.now().plusMinutes(5))
            .build();
    }
}
