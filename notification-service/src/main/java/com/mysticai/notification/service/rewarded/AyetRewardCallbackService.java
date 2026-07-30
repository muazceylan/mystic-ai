package com.mysticai.notification.service.rewarded;

import com.mysticai.notification.config.AyetCallbackProperties;
import com.mysticai.notification.dto.rewarded.AyetCallbackParams;
import com.mysticai.notification.entity.monetization.*;
import com.mysticai.notification.repository.ProviderCallbackEventRepository;
import com.mysticai.notification.repository.RewardSessionRepository;
import com.mysticai.notification.service.monetization.GuruWalletService;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

/**
 * Settles ayeT rewarded-video server-to-server callbacks into Guru Tokens.
 *
 * SECURITY / CORRECTNESS INVARIANTS:
 * - Reward amount is ALWAYS server config ({@code ayet.reward-amount}); the callback
 *   {@code currency_amount} is only validated against the expected value, never used
 *   to size the grant.
 * - external_identifier is an opaque reward-session UUID bound to one user; the grant
 *   goes to that session's owner, so a caller cannot direct tokens to another account.
 * - Idempotency is enforced at three layers: (1) unique {@code (provider, transaction_id)}
 *   on provider_callback_event, (2) pessimistic lock on the reward_session row, and
 *   (3) unique idempotency key on guru_ledger. A replayed transaction can never
 *   double-credit; duplicates return 200 OK.
 * - Token credit + session transition + callback-event insert commit in ONE transaction.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AyetRewardCallbackService {

    private static final RewardProvider PROVIDER = RewardProvider.AYET;

    private final RewardSessionRepository sessionRepository;
    private final ProviderCallbackEventRepository callbackEventRepository;
    private final GuruWalletService walletService;
    private final AyetCallbackProperties props;
    private final AyetSignatureVerifier signatureVerifier;
    private final MeterRegistry meterRegistry;

    /**
     * Self-reference so the @Transactional proxy applies to {@code process}/{@code replay}
     * when invoked from the non-transactional {@link #handle} wrapper (Spring AOP does not
     * apply to plain {@code this.} self-invocation). @Lazy avoids circular init.
     */
    @Autowired
    @Lazy
    private AyetRewardCallbackService self;

    public enum Outcome {
        PROCESSED,             // 200 OK — token granted
        DUPLICATE,             // 200 OK — already processed, no re-grant
        REJECTED_BAD_REQUEST,  // 400 — invalid session / currency amount
        REJECTED_FORBIDDEN,    // 403 — bad placement / adslot / signature / IP
        ERROR                  // 500
    }

    public record CallbackResult(Outcome outcome, String code) {
        static CallbackResult of(Outcome o, String code) { return new CallbackResult(o, code); }
    }

    /**
     * Entry point called by the webhook controller. Non-transactional wrapper so that a
     * concurrency-race unique-constraint violation can be caught and replayed as a
     * clean DUPLICATE in a fresh transaction.
     */
    public CallbackResult handle(AyetCallbackParams p) {
        // ── Transport-level guards (no DB writes) ───────────────────────────
        if (!props.getSecurity().isIpAllowed(p.clientIp())) {
            log.warn("[AYET] Callback from non-allowlisted IP rejected. txn={}", p.transactionId());
            metric("rejected", "reason", "ip_not_allowed");
            return CallbackResult.of(Outcome.REJECTED_FORBIDDEN, "IP_NOT_ALLOWED");
        }
        if (!signatureVerifier.verify(p.signature(), p.transactionId(), p.externalIdentifier())) {
            metric("rejected", "reason", "bad_signature");
            return CallbackResult.of(Outcome.REJECTED_FORBIDDEN, "BAD_SIGNATURE");
        }

        try {
            return self.process(p);
        } catch (DataIntegrityViolationException race) {
            // A concurrent callback won the unique (provider, transaction_id) insert.
            log.info("[AYET] Concurrent duplicate detected via constraint for txn={} — replaying as duplicate.",
                    p.transactionId());
            return self.replay(p.transactionId());
        } catch (RuntimeException e) {
            log.error("[AYET] Unexpected error processing callback txn={} : {}", p.transactionId(), e.getMessage(), e);
            metric("error", "reason", "exception");
            return CallbackResult.of(Outcome.ERROR, "INTERNAL_ERROR");
        }
    }

    // ── Core transactional processing ───────────────────────────────────────

    @Transactional
    public CallbackResult process(AyetCallbackParams p) {
        // 1. Fast-path idempotency.
        Optional<ProviderCallbackEvent> existing =
                callbackEventRepository.findByProviderAndProviderTransactionId(PROVIDER, p.transactionId());
        if (existing.isPresent()) {
            return replayOutcome(existing.get());
        }

        // 2. Config validation — pins the callback to the ad unit we configured.
        if (!props.isCurrencyIdentifierValid(p.currencyIdentifier())) {
            return reject(p, null, null, Outcome.REJECTED_FORBIDDEN, "BAD_CURRENCY_IDENTIFIER");
        }
        if (!props.isPlacementValid(p.placementIdentifier())) {
            return reject(p, null, null, Outcome.REJECTED_FORBIDDEN, "BAD_PLACEMENT");
        }
        if (!props.isAdslotValid(p.adslotId())) {
            return reject(p, null, null, Outcome.REJECTED_FORBIDDEN, "BAD_ADSLOT");
        }
        // 3. Never trust the reported reward size.
        if (!props.isCurrencyAmountValid(p.currencyAmount())) {
            log.warn("[AYET][SECURITY] currency_amount mismatch: got={} expected={} txn={} placement={}",
                    p.currencyAmount(), props.getExpectedCurrencyAmount(), p.transactionId(), p.placementIdentifier());
            return reject(p, null, null, Outcome.REJECTED_BAD_REQUEST, "BAD_CURRENCY_AMOUNT");
        }

        // 4. Resolve reward session (external_identifier must be one of our UUIDs).
        UUID sessionId = parseUuid(p.externalIdentifier());
        if (sessionId == null) {
            return reject(p, null, null, Outcome.REJECTED_BAD_REQUEST, "INVALID_EXTERNAL_IDENTIFIER");
        }

        // Lock the session row so two concurrent callbacks serialise.
        Optional<RewardSession> sessionOpt = sessionRepository.findByIdForUpdate(sessionId);

        // Re-check idempotency now that we hold the lock (a concurrent claimer may have
        // committed the PROCESSED event while we waited for the lock).
        Optional<ProviderCallbackEvent> afterLock =
                callbackEventRepository.findByProviderAndProviderTransactionId(PROVIDER, p.transactionId());
        if (afterLock.isPresent()) {
            return replayOutcome(afterLock.get());
        }

        if (sessionOpt.isEmpty()) {
            return reject(p, sessionId, null, Outcome.REJECTED_BAD_REQUEST, "SESSION_NOT_FOUND");
        }
        RewardSession session = sessionOpt.get();

        if (session.getProvider() != PROVIDER) {
            return reject(p, sessionId, session.getUserId(), Outcome.REJECTED_BAD_REQUEST, "SESSION_PROVIDER_MISMATCH");
        }
        if (session.isExpired() || session.getStatus() == RewardSessionStatus.EXPIRED) {
            if (session.getStatus() == RewardSessionStatus.CREATED) {
                session.setStatus(RewardSessionStatus.EXPIRED);
                sessionRepository.save(session);
            }
            return reject(p, sessionId, session.getUserId(), Outcome.REJECTED_BAD_REQUEST, "SESSION_EXPIRED");
        }
        if (session.getStatus() != RewardSessionStatus.CREATED) {
            // Already REWARDED/REJECTED by a *different* transaction — single-use session.
            return reject(p, sessionId, session.getUserId(), Outcome.REJECTED_BAD_REQUEST, "SESSION_ALREADY_USED");
        }

        // 5. Grant exactly the server-configured amount, idempotent on transaction_id.
        int amount = props.getRewardAmount();
        String idempotencyKey = idempotencyKey(p.transactionId());
        String metadata = buildMetadataJson(p, session.getId());

        GuruLedger ledger = walletService.earnProviderReward(
                session.getUserId(),
                amount,
                PROVIDER.name(),
                p.transactionId(),
                session.getId().toString(),
                p.placementIdentifier(),
                idempotencyKey,
                metadata
        );

        session.setStatus(RewardSessionStatus.REWARDED);
        session.setRewardedAt(LocalDateTime.now());
        sessionRepository.save(session);

        ProviderCallbackEvent event = ProviderCallbackEvent.builder()
                .provider(PROVIDER)
                .providerTransactionId(p.transactionId())
                .userId(session.getUserId())
                .rewardSessionId(session.getId())
                .adslotId(p.adslotId())
                .placementIdentifier(p.placementIdentifier())
                .currencyAmount(p.currencyAmount())
                .payoutUsd(p.payoutUsd())
                .status(ProviderCallbackEvent.CallbackStatus.PROCESSED)
                .rawPayloadHash(hashPayload(p))
                .grantedAmount(amount)
                .ledgerEntryId(ledger != null && ledger.getId() != null ? ledger.getId().toString() : null)
                .processedAt(LocalDateTime.now())
                .build();
        callbackEventRepository.save(event);

        log.info("[AYET] Reward granted: txn={} userId={} sessionId={} amount={} ledgerId={}",
                p.transactionId(), session.getUserId(), session.getId(), amount,
                ledger != null ? ledger.getId() : null);
        metric("processed", "placement", safeTag(p.placementIdentifier()));
        return CallbackResult.of(Outcome.PROCESSED, "OK");
    }

    /** Fresh-transaction replay used after a concurrency-race constraint violation. */
    @Transactional
    public CallbackResult replay(String transactionId) {
        return callbackEventRepository.findByProviderAndProviderTransactionId(PROVIDER, transactionId)
                .map(this::replayOutcome)
                .orElse(CallbackResult.of(Outcome.ERROR, "REPLAY_NOT_FOUND"));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private CallbackResult replayOutcome(ProviderCallbackEvent event) {
        switch (event.getStatus()) {
            case PROCESSED, DUPLICATE -> {
                log.info("[AYET] Duplicate callback (idempotent) txn={} status={} — no re-grant.",
                        event.getProviderTransactionId(), event.getStatus());
                metric("duplicate", "prior_status", event.getStatus().name());
                return CallbackResult.of(Outcome.DUPLICATE, "OK");
            }
            default -> {
                // Prior attempt was rejected; return the same class of rejection.
                metric("duplicate", "prior_status", "REJECTED");
                return CallbackResult.of(Outcome.REJECTED_BAD_REQUEST,
                        event.getRejectionReason() != null ? event.getRejectionReason() : "REJECTED");
            }
        }
    }

    private CallbackResult reject(AyetCallbackParams p, UUID sessionId, Long userId,
                                  Outcome outcome, String reason) {
        log.warn("[AYET] Callback rejected: txn={} reason={} placement={}",
                p.transactionId(), reason, p.placementIdentifier());
        ProviderCallbackEvent event = ProviderCallbackEvent.builder()
                .provider(PROVIDER)
                .providerTransactionId(p.transactionId())
                .userId(userId)
                .rewardSessionId(sessionId)
                .adslotId(p.adslotId())
                .placementIdentifier(p.placementIdentifier())
                .currencyAmount(p.currencyAmount())
                .payoutUsd(p.payoutUsd())
                .status(ProviderCallbackEvent.CallbackStatus.REJECTED)
                .rejectionReason(reason)
                .rawPayloadHash(hashPayload(p))
                .grantedAmount(0)
                .processedAt(LocalDateTime.now())
                .build();
        callbackEventRepository.save(event);
        metric("rejected", "reason", reason);
        return CallbackResult.of(outcome, reason);
    }

    private String idempotencyKey(String transactionId) {
        return "ayet_rewarded_video_" + transactionId;
    }

    private String buildMetadataJson(AyetCallbackParams p, UUID sessionId) {
        // Compact audit blob — no PII. external_identifier is the session UUID (already stored).
        return "{"
                + "\"provider\":\"AYET\","
                + "\"rewardSessionId\":\"" + sessionId + "\","
                + "\"transactionId\":\"" + jsonEscape(p.transactionId()) + "\","
                + "\"payoutUsd\":" + (p.payoutUsd() != null ? p.payoutUsd().toPlainString() : "null") + ","
                + "\"currencyAmount\":" + p.currencyAmount() + ","
                + "\"placement\":\"" + jsonEscape(p.placementIdentifier()) + "\","
                + "\"adslotId\":\"" + jsonEscape(p.adslotId()) + "\""
                + "}";
    }

    static UUID parseUuid(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return UUID.fromString(raw.trim());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String hashPayload(AyetCallbackParams p) {
        String raw = String.join("|",
                nz(p.transactionId()), nz(p.externalIdentifier()), String.valueOf(p.currencyAmount()),
                p.payoutUsd() != null ? p.payoutUsd().toPlainString() : "",
                nz(p.placementIdentifier()), nz(p.adslotId()), nz(p.currencyIdentifier()), nz(p.subId()));
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            return null;
        }
    }

    private static String nz(String s) { return s == null ? "" : s; }

    private static String jsonEscape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static String safeTag(String s) {
        return (s == null || s.isBlank()) ? "unknown" : s;
    }

    private void metric(String event, String... tags) {
        meterRegistry.counter("notification.monetization.ayet_callback." + event, tags).increment();
    }
}
