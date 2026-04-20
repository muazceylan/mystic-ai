package com.mysticai.notification.service.rewarded;

import com.mysticai.notification.repository.RewardIntentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;

/**
 * Fraud and abuse detection for the web rewarded-ad flow.
 * Does NOT block requests — emits structured WARN logs that can be
 * ingested by a SIEM or monitoring system for alerting.
 * Hard blocks are enforced in RewardedAdValidationService.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RewardFraudGuardService {

    private final RewardIntentRepository intentRepository;

    /** IP claim rate threshold: more than this many claims/hour from one IP → suspicious. */
    private static final int IP_HOURLY_CLAIM_THRESHOLD = 5;

    /**
     * Called on intent creation to produce hashed identifiers for later audit.
     * Raw IP and User-Agent are NEVER stored.
     */
    public String hashIdentifier(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            log.error("SHA-256 unavailable — identifier will not be hashed");
            return null;
        }
    }

    /**
     * Run post-creation anomaly checks (async-safe; no transaction required).
     * Logs suspicious patterns for monitoring but does not throw.
     */
    public void auditOnIntentCreated(Long userId, String ipHash, String userAgentHash) {
        if (ipHash == null) return;

        long claimsFromIp = intentRepository
            .findRecentClaimedByIpHash(ipHash, LocalDateTime.now().minusHours(1))
            .size();

        if (claimsFromIp > IP_HOURLY_CLAIM_THRESHOLD) {
            log.warn("[FRAUD_GUARD] High IP claim rate: ipHash={} claimsLastHour={} userId={}",
                ipHash, claimsFromIp, userId);
            // Emit structured event — can be forwarded to alerting.
            emitSuspiciousEvent("HIGH_IP_CLAIM_RATE", userId, ipHash, "claims=" + claimsFromIp);
        }
    }

    /**
     * Run post-claim anomaly checks.
     * Called inside the claim transaction's success path.
     */
    public void auditOnClaim(Long userId, String ipHash, String adSessionId, int intentClaimAttempts) {
        if (intentClaimAttempts > 1) {
            log.warn("[FRAUD_GUARD] Multiple claim attempts on single intent: userId={} attempts={}",
                userId, intentClaimAttempts);
            emitSuspiciousEvent("MULTIPLE_CLAIM_ATTEMPTS", userId, ipHash,
                "attempts=" + intentClaimAttempts);
        }

        if (adSessionId != null && adSessionId.length() < 8) {
            log.warn("[FRAUD_GUARD] Suspicious short adSessionId: userId={} sessionId={}", userId, adSessionId);
            emitSuspiciousEvent("SHORT_SESSION_ID", userId, ipHash, "sessionId=" + adSessionId);
        }
    }

    /**
     * Checks if a duplicate claim is being attempted (same idempotency key).
     * Returns true if it's a safe idempotent re-delivery (already claimed).
     */
    public boolean isDuplicateClaim(String idempotencyKey,
                                    com.mysticai.notification.repository.GuruLedgerRepository ledgerRepository) {
        return ledgerRepository.existsByIdempotencyKey(idempotencyKey);
    }

    private void emitSuspiciousEvent(String eventType, Long userId, String ipHash, String details) {
        // Structured log — can be parsed by Logstash/Loki into a separate fraud index.
        log.warn("[FRAUD_EVENT] type={} userId={} ipHash={} details={}",
            eventType, userId, ipHash, details);
    }
}
