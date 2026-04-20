package com.mysticai.notification.service.rewarded;

import com.mysticai.notification.config.RewardedAdsAllowlistProperties;
import com.mysticai.notification.dto.rewarded.*;
import com.mysticai.notification.entity.monetization.*;
import com.mysticai.notification.repository.GuruLedgerRepository;
import com.mysticai.notification.repository.GuruWalletRepository;
import com.mysticai.notification.repository.RewardIntentRepository;
import com.mysticai.notification.service.monetization.GuruWalletService;
import com.mysticai.notification.service.monetization.WebRewardedAdsEligibilityResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Orchestrates the full rewarded-ad lifecycle.
 *
 * CHANGED FROM V1:
 * - mark-ready is now purely telemetry; claim works from any non-terminal status.
 * - Claim fingerprint (SHA-256 of intentId|adSessionId|clientEventId) stored on first claim.
 *   Same fingerprint → idempotentReplay=true (200). Different fingerprint → SESSION_CONFLICT (409).
 * - Origin / placementKey sanity-checked against allowlist (warn or block per config).
 * - Reward amount ALWAYS comes from server config / persisted intent — never from request.
 * - Analytics emitted AFTER transaction commits (no external call inside TX boundary).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RewardedAdService {

    private final RewardIntentRepository intentRepository;
    private final GuruWalletRepository walletRepository;
    private final GuruLedgerRepository ledgerRepository;
    private final GuruWalletService walletService;
    private final RewardedAdValidationService validationService;
    private final RewardFraudGuardService fraudGuard;
    private final RewardedAdsAllowlistProperties allowlist;
    private final WebRewardedAdsEligibilityResolver webRewardedAdsEligibilityResolver;

    @Value("${rewarded-ads.intent-ttl-seconds:300}")
    private int intentTtlSeconds;

    @Value("${rewarded-ads.default-reward-amount:5}")
    private int defaultRewardAmount;

    @Value("${rewarded-ads.ad-unit-path:/}")
    private String adUnitPath;

    @Value("${rewarded-ads.placement-key:web_earn_page}")
    private String placementKey;

    @Value("${rewarded-ads.daily-limit:10}")
    private int dailyLimit;

    // ── Create Intent ──────────────────────────────────────────────────────

    @Transactional
    public CreateRewardIntentResponse createIntent(
            Long userId, String ipHash, String uaHash, String pageCtx, String origin) {

        if (!webRewardedAdsEligibilityResolver.isWebRewardedAdsEnabledForPublishedSettings()) {
            throw new RewardedAdDisabledException("Rewarded ads şu an devre dışı. Daha sonra tekrar deneyin.");
        }

        // Origin sanity check.
        checkOrigin(origin);

        validationService.validateCanCreateIntent(userId);

        LocalDateTime now = LocalDateTime.now();
        RewardIntent intent = RewardIntent.builder()
                .userId(userId)
                .status(RewardIntentStatus.PENDING)
                .source(RewardClaimSource.WEB_REWARDED_AD)
                .rewardAmount(defaultRewardAmount)   // server-side only
                .rewardType("GURU_TOKEN")
                .adUnitPath(adUnitPath)              // server-side only; frontend value ignored
                .placementKey(placementKey)
                .pageContext(pageCtx)
                .userAgentHash(uaHash)
                .ipHash(ipHash)
                .expiresAt(now.plusSeconds(intentTtlSeconds))
                .build();

        intent = intentRepository.save(intent);

        if (intent.getIdempotencyKey() == null) {
            intent.setIdempotencyKey(RewardIntent.buildIdempotencyKey(intent.getId(), userId));
            intent = intentRepository.save(intent);
        }

        log.info("[REWARD] Intent created: intentId={} userId={} amount={}", intent.getId(), userId, defaultRewardAmount);
        fraudGuard.auditOnIntentCreated(userId, ipHash, uaHash);

        return new CreateRewardIntentResponse(
                intent.getId(),
                intent.getRewardAmount(),
                intent.getRewardType(),
                intent.getExpiresAt(),
                new CreateRewardIntentResponse.AdConfig(adUnitPath, true, placementKey)
        );
    }

    // ── Mark Ready (telemetry only) ────────────────────────────────────────

    /**
     * Transitions intent PENDING → AD_READY for diagnostic purposes only.
     *
     * WHY RELAXED: mark-ready no longer gates the claim flow. This endpoint is
     * informational (tracks ad-ready latency). Claim succeeds even if this was
     * never called (no-fill path, ad-blocker recovery, etc.).
     */
    @Transactional
    public void markReady(UUID intentId, Long userId, String adSessionId, String clientEventId) {
        RewardIntent intent = intentRepository.findById(intentId)
            .orElse(null);

        if (intent == null) {
            log.debug("[REWARD] mark-ready for unknown intentId={} (telemetry only, ignored)", intentId);
            return; // Silently ignore — telemetry endpoint, not critical.
        }
        if (!intent.getUserId().equals(userId)) {
            log.warn("[REWARD] mark-ready ownership mismatch intentId={} userId={}", intentId, userId);
            return; // Log but don't throw — non-critical path.
        }
        if (intent.isTerminal() || intent.isExpired()) {
            log.debug("[REWARD] mark-ready on terminal/expired intentId={} status={}", intentId, intent.getStatus());
            return;
        }
        if (intent.getStatus() == RewardIntentStatus.PENDING) {
            intent.setStatus(RewardIntentStatus.AD_READY);
            if (adSessionId != null) intent.setAdSessionId(adSessionId);
            intentRepository.save(intent);
            log.info("[REWARD] Intent AD_READY (telemetry): intentId={} userId={}", intentId, userId);
        }
    }

    // ── Claim Reward ───────────────────────────────────────────────────────

    /**
     * Atomically claims the reward.
     *
     * Fingerprint logic (resolves duplicate-claim ambiguity):
     * - fingerprint = SHA-256(intentId | adSessionId | clientEventId)
     * - First claim: fingerprint stored; wallet + ledger updated.
     * - Second claim, SAME fingerprint: 200, idempotentReplay=true, no double-credit.
     * - Second claim, DIFFERENT fingerprint: 409, SESSION_CONFLICT.
     *
     * Transaction boundary:
     * - Intent update + wallet + ledger = single ACID unit.
     * - Analytics NOT emitted inside the transaction (no external dependency in TX).
     *
     * Concurrency:
     * - PESSIMISTIC_WRITE on intent row (acquired first) prevents concurrent claims.
     * - GuruWalletService also locks the wallet row (double protection).
     * - Unique constraint on guru_ledger.idempotency_key prevents duplicate ledger entries.
     */
    @Transactional
    public ClaimRewardResponse claimReward(UUID intentId, Long userId, ClaimRewardRequest req) {
        // Lock intent row first.
        RewardIntent intent = intentRepository.findByIdForUpdate(intentId)
            .orElseThrow(() -> new RewardedAdNotFoundException("Reklam seansı bulunamadı."));

        // Validate placementKey against allowlist.
        if (!allowlist.isPlacementAllowed(intent.getPlacementKey())) {
            log.warn("[REWARD] Unrecognised placementKey={} intentId={}", intent.getPlacementKey(), intentId);
            // Non-blocking by default; allowlist.enforceOriginCheck applies to origins only.
        }

        // Compute claim fingerprint from server-known + client-provided signals.
        String fingerprint = computeFingerprint(intentId, req.adSessionId(), req.clientEventId());

        // ── Idempotency / conflict resolution ──────────────────────────────
        if (intent.isClaimed()) {
            if (fingerprint.equals(intent.getClaimFingerprint())) {
                // SAFE IDEMPOTENT RETRY — same fingerprint (network retry / client retry).
                log.info("[REWARD] Idempotent replay (same fingerprint): intentId={} userId={}", intentId, userId);
                GuruLedger existing = ledgerRepository
                    .findByIdempotencyKey(intent.getIdempotencyKey()).orElse(null);
                int balance = walletRepository.findByUserId(userId)
                    .map(GuruWallet::getCurrentBalance).orElse(0);
                return ClaimRewardResponse.idempotentReplay(
                    balance, intent.getRewardAmount(),
                    existing != null ? existing.getId() : null);
            } else {
                // CONFLICT — different fingerprint (suspicious replay / cross-tab abuse).
                log.warn("[REWARD] SESSION_CONFLICT: different fingerprint on claimed intent intentId={} userId={}",
                    intentId, userId);
                throw new RewardedAdValidationService.RewardValidationException(
                    "SESSION_CONFLICT",
                    "Bu ödül zaten farklı bir seans üzerinden alındı. Çift talep engellendi.");
            }
        }

        // Increment attempt counter for fraud audit (before validation throw).
        intent.setClaimAttempts(intent.getClaimAttempts() + 1);

        validationService.validateCanClaim(intent, userId, req.adSessionId());
        fraudGuard.auditOnClaim(userId, intent.getIpHash(), req.adSessionId(), intent.getClaimAttempts());

        // Advance status to GRANTED then CLAIMED (single transition).
        intent.setStatus(RewardIntentStatus.CLAIMED);
        intent.setGrantedAt(LocalDateTime.now());
        intent.setClaimedAt(LocalDateTime.now());
        intent.setAdSessionId(req.adSessionId());
        intent.setClaimFingerprint(fingerprint); // store first-claim fingerprint
        if (req.grantedPayloadSummary() != null) {
            String safe = req.grantedPayloadSummary().length() > 1024
                ? req.grantedPayloadSummary().substring(0, 1024)
                : req.grantedPayloadSummary();
            intent.setGrantedPayloadJson(safe);
        }
        intentRepository.save(intent);

        // Credit wallet + ledger (idempotent via idempotencyKey).
        // IMPORTANT: reward amount comes from intent (server-persisted), not from request.
        GuruLedger ledgerEntry = walletService.earnReward(
                userId,
                intent.getRewardAmount(),
                "web_rewarded_ad:" + intentId,
                "earn",
                placementKey,
                "WEB",
                null,
                intent.getIdempotencyKey()
        );

        int newBalance = walletRepository.findByUserId(userId)
            .map(GuruWallet::getCurrentBalance).orElse(0);

        log.info("[REWARD] Claim successful: intentId={} userId={} amount={} newBalance={} ledgerId={}",
            intentId, userId, intent.getRewardAmount(), newBalance, ledgerEntry.getId());

        // Analytics emitted AFTER the transaction (annotation-managed commit).
        // Callers should emit events on successful return — not inside this method.

        return ClaimRewardResponse.fresh(newBalance, intent.getRewardAmount(), ledgerEntry.getId().toString());
    }

    // ── Wallet Summary ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RewardWalletSummaryResponse getWalletSummary(Long userId) {
        GuruWallet wallet = walletService.getOrCreateWallet(userId);
        LocalDateTime todayStart = LocalDate.now(ZoneOffset.UTC).atStartOfDay();
        int todayCount = (int) intentRepository.countClaimedToday(userId, todayStart);
        int earned = todayCount * defaultRewardAmount;
        int remaining = Math.max(0, dailyLimit - todayCount);

        return new RewardWalletSummaryResponse(
                wallet.getCurrentBalance(),
                wallet.getLifetimeEarned(),
                earned,
                dailyLimit * defaultRewardAmount,
                remaining * defaultRewardAmount,
                remaining == 0,
                defaultRewardAmount,
                webRewardedAdsEligibilityResolver.isWebRewardedAdsEnabledForPublishedSettings()
        );
    }

    // ── Scheduled cleanup ──────────────────────────────────────────────────

    @Transactional
    public int expireStaleIntents() {
        int count = intentRepository.expireStaleIntents(LocalDateTime.now());
        if (count > 0) log.info("[REWARD] Expired {} stale reward intents", count);
        return count;
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    /**
     * Claim fingerprint = SHA-256(intentId | adSessionId | clientEventId).
     *
     * WHY: Identifies the unique "call context" of a claim request.
     * Same values → same fingerprint → safe idempotent retry.
     * Any field differs → different fingerprint → potential conflict.
     *
     * Uses intentId (server-known, unguessable UUID) as the primary anchor so
     * the fingerprint can't be forged by manipulating only client fields.
     */
    static String computeFingerprint(UUID intentId, String adSessionId, String clientEventId) {
        String raw = intentId + "|"
            + (adSessionId != null ? adSessionId : "")
            + "|"
            + (clientEventId != null ? clientEventId : "");
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is always available in any JRE.
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private void checkOrigin(String origin) {
        if (origin == null || origin.isBlank()) return;
        if (!allowlist.isOriginAllowed(origin)) {
            log.warn("[REWARD] Origin not in allowlist: origin={}", origin);
            if (allowlist.isEnforceOriginCheck()) {
                throw new OriginNotAllowedException("Bu kaynaktan istek kabul edilmiyor.");
            }
        }
    }

    // ── Domain exceptions ──────────────────────────────────────────────────

    public static class RewardedAdDisabledException extends RuntimeException {
        public RewardedAdDisabledException(String m) { super(m); }
    }

    public static class RewardedAdNotFoundException extends RuntimeException {
        public RewardedAdNotFoundException(String m) { super(m); }
    }

    public static class OriginNotAllowedException extends RuntimeException {
        public OriginNotAllowedException(String m) { super(m); }
    }
}
