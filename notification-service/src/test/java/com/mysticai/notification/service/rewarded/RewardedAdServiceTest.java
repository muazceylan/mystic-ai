package com.mysticai.notification.service.rewarded;

import com.mysticai.notification.config.RewardedAdsAllowlistProperties;
import com.mysticai.notification.dto.rewarded.ClaimRewardRequest;
import com.mysticai.notification.dto.rewarded.ClaimRewardResponse;
import com.mysticai.notification.dto.rewarded.CreateRewardIntentResponse;
import com.mysticai.notification.entity.monetization.*;
import com.mysticai.notification.repository.GuruLedgerRepository;
import com.mysticai.notification.repository.GuruWalletRepository;
import com.mysticai.notification.repository.MonetizationSettingsRepository;
import com.mysticai.notification.repository.RewardIntentRepository;
import com.mysticai.notification.service.monetization.GuruWalletService;
import com.mysticai.notification.service.monetization.WebRewardedAdsEligibilityResolver;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("RewardedAdService — unit tests")
class RewardedAdServiceTest {

    @Mock private RewardIntentRepository intentRepository;
    @Mock private GuruWalletRepository walletRepository;
    @Mock private GuruLedgerRepository ledgerRepository;
    @Mock private GuruWalletService walletService;
    @Mock private RewardedAdValidationService validationService;
    @Mock private RewardFraudGuardService fraudGuard;
    @Mock private MonetizationSettingsRepository settingsRepository;
    // Required so RewardedAdService constructor injection doesn't fail.
    @Mock private RewardedAdsAllowlistProperties allowlist;

    private RewardedAdService service;
    private WebRewardedAdsEligibilityResolver webRewardedAdsEligibilityResolver;

    private static final Long USER_ID = 42L;

    @BeforeEach
    void setUp() {
        webRewardedAdsEligibilityResolver = new WebRewardedAdsEligibilityResolver(settingsRepository, new ObjectMapper());
        ReflectionTestUtils.setField(webRewardedAdsEligibilityResolver, "rewardedAdsKillSwitchEnabled", true);
        service = new RewardedAdService(
                intentRepository,
                walletRepository,
                ledgerRepository,
                walletService,
                validationService,
                fraudGuard,
                allowlist,
                webRewardedAdsEligibilityResolver
        );
        ReflectionTestUtils.setField(service, "intentTtlSeconds", 300);
        ReflectionTestUtils.setField(service, "defaultRewardAmount", 5);
        ReflectionTestUtils.setField(service, "adUnitPath", "/12345/mysticai/rewarded_earn");
        ReflectionTestUtils.setField(service, "placementKey", "web_earn_page");
        ReflectionTestUtils.setField(service, "dailyLimit", 10);
        when(allowlist.isOriginAllowed(anyString())).thenReturn(true);
        when(allowlist.isPlacementAllowed(anyString())).thenReturn(true);
        when(allowlist.isEnforceOriginCheck()).thenReturn(false);
    }

    // ── createIntent ───────────────────────────────────────────────────────

    @Test
    @DisplayName("createIntent — happy path creates intent with correct fields")
    void createIntent_happyPath() {
        UUID intentId = UUID.randomUUID();
        RewardIntent saved = buildIntent(intentId, RewardIntentStatus.PENDING);
        saved.setIdempotencyKey(RewardIntent.buildIdempotencyKey(intentId, USER_ID));
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
            .thenReturn(Optional.of(enabledSettings()));

        when(intentRepository.save(any())).thenReturn(saved);
        doNothing().when(validationService).validateCanCreateIntent(USER_ID);
        doNothing().when(fraudGuard).auditOnIntentCreated(any(), any(), any());

        CreateRewardIntentResponse resp = service.createIntent(USER_ID, "ipHash", "uaHash", "/earn", "https://app.mysticai.com");

        assertThat(resp.intentId()).isEqualTo(intentId);
        assertThat(resp.rewardAmount()).isEqualTo(5);
        assertThat(resp.rewardType()).isEqualTo("GURU_TOKEN");
        assertThat(resp.adConfig().supported()).isTrue();

        verify(validationService).validateCanCreateIntent(USER_ID);
        ArgumentCaptor<RewardIntent> captor = ArgumentCaptor.forClass(RewardIntent.class);
        verify(intentRepository, atLeastOnce()).save(captor.capture());
        RewardIntent captured = captor.getAllValues().get(0);
        assertThat(captured.getRewardAmount()).isEqualTo(5);
        assertThat(captured.getSource()).isEqualTo(RewardClaimSource.WEB_REWARDED_AD);
    }

    @Test
    @DisplayName("createIntent — throws when rewarded ads disabled")
    void createIntent_disabled() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
            .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createIntent(USER_ID, null, null, "/earn", null))
            .isInstanceOf(RewardedAdService.RewardedAdDisabledException.class);

        verifyNoInteractions(intentRepository);
    }

    @Test
    @DisplayName("createIntent — throws OriginNotAllowedException when origin blocked and enforcement on")
    void createIntent_originBlocked() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
            .thenReturn(Optional.of(enabledSettings()));
        when(allowlist.isOriginAllowed("https://evil.com")).thenReturn(false);
        when(allowlist.isEnforceOriginCheck()).thenReturn(true);
        doNothing().when(validationService).validateCanCreateIntent(USER_ID);

        assertThatThrownBy(() -> service.createIntent(USER_ID, null, null, "/earn", "https://evil.com"))
            .isInstanceOf(RewardedAdService.OriginNotAllowedException.class);

        verifyNoInteractions(intentRepository);
    }

    @Test
    @DisplayName("createIntent — propagates validation exception from validationService")
    void createIntent_dailyCapBlocked() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
            .thenReturn(Optional.of(enabledSettings()));
        doThrow(new RewardedAdValidationService.RewardValidationException(
            "DAILY_CAP_REACHED", "Daily cap reached"))
            .when(validationService).validateCanCreateIntent(USER_ID);

        assertThatThrownBy(() -> service.createIntent(USER_ID, null, null, "/earn", null))
            .isInstanceOf(RewardedAdValidationService.RewardValidationException.class)
            .hasMessage("Daily cap reached");

        verifyNoInteractions(intentRepository);
    }

    // ── claimReward ────────────────────────────────────────────────────────

    @Test
    @DisplayName("claimReward — happy path credits wallet and returns fresh success (idempotentReplay=false)")
    void claimReward_happyPath() {
        UUID intentId = UUID.randomUUID();
        RewardIntent intent = buildIntent(intentId, RewardIntentStatus.GRANTED);
        intent.setIdempotencyKey(RewardIntent.buildIdempotencyKey(intentId, USER_ID));

        GuruLedger ledger = GuruLedger.builder()
            .id(UUID.randomUUID())
            .userId(USER_ID).amount(5).balanceBefore(10).balanceAfter(15)
            .transactionType(GuruLedger.TransactionType.REWARD_EARNED)
            .sourceType(GuruLedger.SourceType.REWARDED_AD)
            .build();

        GuruWallet wallet = GuruWallet.builder().userId(USER_ID).currentBalance(15).build();

        when(intentRepository.findByIdForUpdate(intentId)).thenReturn(Optional.of(intent));
        when(intentRepository.save(any())).thenReturn(intent);
        when(walletService.earnReward(anyLong(), anyInt(), anyString(), anyString(), anyString(), anyString(), isNull(), anyString()))
            .thenReturn(ledger);
        when(walletRepository.findByUserId(USER_ID)).thenReturn(Optional.of(wallet));
        doNothing().when(validationService).validateCanClaim(any(), any(), any());
        doNothing().when(fraudGuard).auditOnClaim(any(), any(), any(), anyInt());
        when(allowlist.isPlacementAllowed(any())).thenReturn(true);

        ClaimRewardRequest req = new ClaimRewardRequest(
            "sessionAbc", "clientEventId", "/earn", "Mozilla/5.0", "{}");

        ClaimRewardResponse resp = service.claimReward(intentId, USER_ID, req);

        assertThat(resp.success()).isTrue();
        assertThat(resp.grantedAmount()).isEqualTo(5);
        assertThat(resp.walletBalance()).isEqualTo(15);
        assertThat(resp.idempotentReplay()).isFalse(); // fresh claim

        // Verify intent transitioned to CLAIMED with fingerprint stored.
        ArgumentCaptor<RewardIntent> intentCaptor = ArgumentCaptor.forClass(RewardIntent.class);
        verify(intentRepository, atLeastOnce()).save(intentCaptor.capture());
        RewardIntent saved = intentCaptor.getValue();
        assertThat(saved.getStatus()).isEqualTo(RewardIntentStatus.CLAIMED);
        assertThat(saved.getClaimedAt()).isNotNull();
        assertThat(saved.getClaimFingerprint()).isNotNull(); // fingerprint stored
    }

    @Test
    @DisplayName("claimReward — PENDING intent (mark-ready never called) succeeds as fresh claim")
    void claimReward_pendingIntentClaimSucceeds() {
        // WHY: mark-ready is now telemetry-only. PENDING is a valid non-terminal
        // status; claim should succeed (validation service will not reject it).
        UUID intentId = UUID.randomUUID();
        RewardIntent intent = buildIntent(intentId, RewardIntentStatus.PENDING);
        intent.setIdempotencyKey(RewardIntent.buildIdempotencyKey(intentId, USER_ID));

        GuruLedger ledger = GuruLedger.builder()
            .id(UUID.randomUUID())
            .userId(USER_ID).amount(5).balanceBefore(0).balanceAfter(5)
            .transactionType(GuruLedger.TransactionType.REWARD_EARNED)
            .sourceType(GuruLedger.SourceType.REWARDED_AD)
            .build();
        GuruWallet wallet = GuruWallet.builder().userId(USER_ID).currentBalance(5).build();

        when(intentRepository.findByIdForUpdate(intentId)).thenReturn(Optional.of(intent));
        when(intentRepository.save(any())).thenReturn(intent);
        when(walletService.earnReward(anyLong(), anyInt(), anyString(), anyString(), anyString(), anyString(), nullable(String.class), anyString()))
            .thenReturn(ledger);
        when(walletRepository.findByUserId(USER_ID)).thenReturn(Optional.of(wallet));
        doNothing().when(validationService).validateCanClaim(any(), any(), any()); // PENDING accepted
        doNothing().when(fraudGuard).auditOnClaim(any(), any(), any(), anyInt());
        when(allowlist.isPlacementAllowed(any())).thenReturn(true);

        ClaimRewardRequest req = new ClaimRewardRequest(
            "session-no-ready", "eid", "/earn", "UA", null);

        ClaimRewardResponse resp = service.claimReward(intentId, USER_ID, req);

        assertThat(resp.success()).isTrue();
        assertThat(resp.idempotentReplay()).isFalse();
        // Validate wallet service was called — real credit happened.
        verify(walletService).earnReward(anyLong(), anyInt(), anyString(), anyString(), anyString(), anyString(), nullable(String.class), anyString());
    }

    @Test
    @DisplayName("claimReward — same fingerprint on claimed intent returns idempotentReplay=true, no double-credit")
    void claimReward_sameFingerprint_idempotentReplay() {
        UUID intentId = UUID.randomUUID();
        String adSessionId  = "sessionAbc";
        String clientEventId = "eid-123";

        // Pre-compute the fingerprint the service will compute for this request.
        String expectedFingerprint = RewardedAdService.computeFingerprint(intentId, adSessionId, clientEventId);

        RewardIntent intent = buildIntent(intentId, RewardIntentStatus.CLAIMED);
        intent.setIdempotencyKey(RewardIntent.buildIdempotencyKey(intentId, USER_ID));
        intent.setRewardAmount(5);
        intent.setClaimFingerprint(expectedFingerprint); // same fingerprint stored

        GuruLedger existingLedger = GuruLedger.builder()
            .id(UUID.randomUUID())
            .userId(USER_ID).amount(5).balanceBefore(5).balanceAfter(10)
            .transactionType(GuruLedger.TransactionType.REWARD_EARNED)
            .sourceType(GuruLedger.SourceType.REWARDED_AD)
            .build();
        GuruWallet wallet = GuruWallet.builder().userId(USER_ID).currentBalance(10).build();

        when(intentRepository.findByIdForUpdate(intentId)).thenReturn(Optional.of(intent));
        when(ledgerRepository.findByIdempotencyKey(any())).thenReturn(Optional.of(existingLedger));
        when(walletRepository.findByUserId(USER_ID)).thenReturn(Optional.of(wallet));
        when(allowlist.isPlacementAllowed(any())).thenReturn(true);

        ClaimRewardRequest req = new ClaimRewardRequest(
            adSessionId, clientEventId, "/earn", "Mozilla/5.0", null);

        ClaimRewardResponse resp = service.claimReward(intentId, USER_ID, req);

        assertThat(resp.success()).isTrue();
        assertThat(resp.idempotentReplay()).isTrue();
        assertThat(resp.walletBalance()).isEqualTo(10);
        // No wallet update — existing ledger entry returned.
        verifyNoInteractions(walletService);
    }

    @Test
    @DisplayName("claimReward — different fingerprint on claimed intent throws SESSION_CONFLICT")
    void claimReward_differentFingerprint_sessionConflict() {
        UUID intentId = UUID.randomUUID();

        // Intent was claimed with one fingerprint...
        String storedFingerprint = RewardedAdService.computeFingerprint(intentId, "original-session", "original-eid");

        RewardIntent intent = buildIntent(intentId, RewardIntentStatus.CLAIMED);
        intent.setIdempotencyKey(RewardIntent.buildIdempotencyKey(intentId, USER_ID));
        intent.setClaimFingerprint(storedFingerprint);

        when(intentRepository.findByIdForUpdate(intentId)).thenReturn(Optional.of(intent));
        when(allowlist.isPlacementAllowed(any())).thenReturn(true);

        // ...but request comes with DIFFERENT session/event IDs.
        ClaimRewardRequest req = new ClaimRewardRequest(
            "different-session", "different-eid", "/earn", "UA", null);

        assertThatThrownBy(() -> service.claimReward(intentId, USER_ID, req))
            .isInstanceOf(RewardedAdValidationService.RewardValidationException.class)
            .extracting("code").isEqualTo("SESSION_CONFLICT");

        verifyNoInteractions(walletService);
    }

    @Test
    @DisplayName("claimReward — throws NOT_FOUND when intent does not exist")
    void claimReward_notFound() {
        UUID intentId = UUID.randomUUID();
        when(intentRepository.findByIdForUpdate(intentId)).thenReturn(Optional.empty());

        ClaimRewardRequest req = new ClaimRewardRequest(
            "sess", "eid", "/earn", "UA", null);

        assertThatThrownBy(() -> service.claimReward(intentId, USER_ID, req))
            .isInstanceOf(RewardedAdService.RewardedAdNotFoundException.class);
    }

    @Test
    @DisplayName("claimReward — expired intent rejected by validationService")
    void claimReward_expired() {
        UUID intentId = UUID.randomUUID();
        RewardIntent intent = buildIntent(intentId, RewardIntentStatus.GRANTED);
        intent.setExpiresAt(LocalDateTime.now().minusMinutes(10)); // already expired

        when(intentRepository.findByIdForUpdate(intentId)).thenReturn(Optional.of(intent));
        when(intentRepository.save(any())).thenReturn(intent);
        when(allowlist.isPlacementAllowed(any())).thenReturn(true);
        doThrow(new RewardedAdValidationService.RewardValidationException(
            "INTENT_EXPIRED", "Süresi doldu"))
            .when(validationService).validateCanClaim(any(), any(), any());

        ClaimRewardRequest req = new ClaimRewardRequest(
            "sess", "eid", "/earn", "UA", null);

        assertThatThrownBy(() -> service.claimReward(intentId, USER_ID, req))
            .isInstanceOf(RewardedAdValidationService.RewardValidationException.class)
            .hasMessage("Süresi doldu");

        verifyNoInteractions(walletService);
    }

    // ── computeFingerprint (static helper) ────────────────────────────────

    @Test
    @DisplayName("computeFingerprint — same inputs always produce same hash")
    void computeFingerprint_deterministic() {
        UUID id = UUID.fromString("11111111-1111-1111-1111-111111111111");
        String fp1 = RewardedAdService.computeFingerprint(id, "sess", "eid");
        String fp2 = RewardedAdService.computeFingerprint(id, "sess", "eid");
        assertThat(fp1).isEqualTo(fp2).hasSize(64); // SHA-256 hex = 64 chars
    }

    @Test
    @DisplayName("computeFingerprint — different adSessionId produces different hash")
    void computeFingerprint_variesBySession() {
        UUID id = UUID.randomUUID();
        String fp1 = RewardedAdService.computeFingerprint(id, "sess-A", "eid");
        String fp2 = RewardedAdService.computeFingerprint(id, "sess-B", "eid");
        assertThat(fp1).isNotEqualTo(fp2);
    }

    @Test
    @DisplayName("computeFingerprint — null session/event treated as empty string")
    void computeFingerprint_nullsToEmpty() {
        UUID id = UUID.randomUUID();
        String fp = RewardedAdService.computeFingerprint(id, null, null);
        assertThat(fp).isNotNull().hasSize(64);
    }

    // ── expireStaleIntents ─────────────────────────────────────────────────

    @Test
    @DisplayName("expireStaleIntents — delegates to repository and returns count")
    void expireStaleIntents() {
        when(intentRepository.expireStaleIntents(any())).thenReturn(3);
        int count = service.expireStaleIntents();
        assertThat(count).isEqualTo(3);
    }

    @Test
    @DisplayName("getWalletSummary — published web ads enabled returns rewardedAdsEnabled=true")
    void getWalletSummary_publishedWebAdsEnabled_returnsTrue() {
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
            .thenReturn(Optional.of(enabledSettings()));
        when(walletService.getOrCreateWallet(USER_ID))
            .thenReturn(GuruWallet.builder().userId(USER_ID).currentBalance(12).lifetimeEarned(30).build());
        when(intentRepository.countClaimedToday(eq(USER_ID), any(LocalDateTime.class))).thenReturn(1L);

        var response = service.getWalletSummary(USER_ID);

        assertThat(response.rewardedAdsEnabled()).isTrue();
    }

    @Test
    @DisplayName("getWalletSummary — published web ads disabled returns rewardedAdsEnabled=false")
    void getWalletSummary_publishedWebAdsDisabled_returnsFalse() {
        MonetizationSettings settings = enabledSettings();
        settings.setEnvironmentRulesJson("""
            {"webAdsEnabled":false}
            """);

        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
            .thenReturn(Optional.of(settings));
        when(walletService.getOrCreateWallet(USER_ID))
            .thenReturn(GuruWallet.builder().userId(USER_ID).currentBalance(12).lifetimeEarned(30).build());
        when(intentRepository.countClaimedToday(eq(USER_ID), any(LocalDateTime.class))).thenReturn(1L);

        var response = service.getWalletSummary(USER_ID);

        assertThat(response.rewardedAdsEnabled()).isFalse();
    }

    @Test
    @DisplayName("getWalletSummary — env kill switch overrides published web ads and returns false")
    void getWalletSummary_envKillSwitchDisabled_returnsFalse() {
        ReflectionTestUtils.setField(webRewardedAdsEligibilityResolver, "rewardedAdsKillSwitchEnabled", false);
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
            .thenReturn(Optional.of(enabledSettings()));
        when(walletService.getOrCreateWallet(USER_ID))
            .thenReturn(GuruWallet.builder().userId(USER_ID).currentBalance(12).lifetimeEarned(30).build());
        when(intentRepository.countClaimedToday(eq(USER_ID), any(LocalDateTime.class))).thenReturn(1L);

        var response = service.getWalletSummary(USER_ID);

        assertThat(response.rewardedAdsEnabled()).isFalse();
    }

    @Test
    @DisplayName("createIntent — published settings disable web ads and intent is blocked")
    void createIntent_adminWebAdsDisabled() {
        MonetizationSettings settings = enabledSettings();
        settings.setEnvironmentRulesJson("""
            {"platforms":{"web":{"adsEnabled":false}}}
            """);
        when(settingsRepository.findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED))
            .thenReturn(Optional.of(settings));

        assertThatThrownBy(() -> service.createIntent(USER_ID, null, null, "/earn", null))
            .isInstanceOf(RewardedAdService.RewardedAdDisabledException.class);

        verifyNoInteractions(intentRepository);
    }

    // ── helpers ────────────────────────────────────────────────────────────

    private RewardIntent buildIntent(UUID id, RewardIntentStatus status) {
        return RewardIntent.builder()
            .id(id)
            .userId(USER_ID)
            .status(status)
            .source(RewardClaimSource.WEB_REWARDED_AD)
            .rewardAmount(5)
            .rewardType("GURU_TOKEN")
            .placementKey("web_earn_page")
            .expiresAt(LocalDateTime.now().plusMinutes(5))
            .build();
    }

    private MonetizationSettings enabledSettings() {
        return MonetizationSettings.builder()
            .settingsKey("default")
            .isEnabled(true)
            .isAdsEnabled(true)
            .status(MonetizationSettings.Status.PUBLISHED)
            .build();
    }
}
