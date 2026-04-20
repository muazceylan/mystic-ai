package com.mysticai.notification.controller;

import com.mysticai.notification.config.RewardedAdsAllowlistProperties;
import com.mysticai.notification.dto.rewarded.*;
import com.mysticai.notification.security.SecurityContextHelper;
import com.mysticai.notification.service.rewarded.RewardedAdService;
import com.mysticai.notification.service.rewarded.RewardedAdValidationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

/**
 * REST controller for the web rewarded-ad flow.
 *
 * CHANGED FROM V1:
 * - userId no longer read from X-User-Id request header.
 *   It is extracted exclusively from the Spring Security context (set by UserJwtFilter).
 *   WHY: eliminates trust in client-injectable or gateway-injectable headers for this
 *   high-security flow; UserJwtFilter validates the Bearer token independently.
 *
 * - mark-ready endpoint is now telemetry-only (no 400/409 on failure).
 * - Claim response includes idempotentReplay flag.
 * - Origin header forwarded to service for allowlist check.
 *
 * Base path: /api/v1/monetization/rewarded-ads
 */
@RestController
@RequestMapping("/api/v1/monetization/rewarded-ads")
@RequiredArgsConstructor
@Slf4j
public class RewardedAdsController {

    private final RewardedAdService rewardedAdService;
    private final RewardedAdsAllowlistProperties allowlist;

    // ── POST /intents ──────────────────────────────────────────────────────

    @PostMapping("/intents")
    public ResponseEntity<CreateRewardIntentResponse> createIntent(
            @RequestHeader(value = "X-Forwarded-For", required = false) String forwardedFor,
            @RequestHeader(value = "User-Agent",       required = false) String userAgent,
            @RequestHeader(value = "Origin",           required = false) String origin,
            @RequestParam(value = "page", required = false, defaultValue = "/earn") String page,
            HttpServletRequest request
    ) {
        // Auth: UserJwtFilter has already validated the JWT and set the Security context.
        Long userId = SecurityContextHelper.getRequiredUserId();

        String clientIp = extractClientIp(forwardedFor, request);
        String ipHash   = sha256(clientIp);
        String uaHash   = sha256(userAgent);
        String pageCtx  = sanitizePage(page);

        try {
            CreateRewardIntentResponse resp =
                rewardedAdService.createIntent(userId, ipHash, uaHash, pageCtx, origin);
            log.info("[REWARD_API] Intent created: intentId={} userId={}", resp.intentId(), userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(resp);
        } catch (RewardedAdService.RewardedAdDisabledException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, e.getMessage());
        } catch (RewardedAdService.OriginNotAllowedException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        // RewardValidationException propagates to @ExceptionHandler.
    }

    // ── POST /intents/{id}/mark-ready ──────────────────────────────────────

    /**
     * TELEMETRY ONLY. Transitions intent to AD_READY for diagnostics.
     * Failure here does NOT block claim. Always returns 204.
     */
    @PostMapping("/intents/{intentId}/mark-ready")
    public ResponseEntity<Void> markReady(
            @PathVariable UUID intentId,
            @Valid @RequestBody MarkReadyRequest req
    ) {
        Long userId = SecurityContextHelper.getRequiredUserId();
        rewardedAdService.markReady(intentId, userId, req.adSessionId(), req.clientEventId());
        return ResponseEntity.noContent().build();
    }

    // ── POST /intents/{id}/claim ───────────────────────────────────────────

    /**
     * Claims the reward after GPT fires rewardedSlotGranted.
     *
     * Idempotency:
     * - Same fingerprint (intentId + adSessionId + clientEventId) → 200 idempotentReplay=true
     * - Different fingerprint on already-claimed intent → 409 SESSION_CONFLICT
     */
    @PostMapping("/intents/{intentId}/claim")
    public ResponseEntity<ClaimRewardResponse> claimReward(
            @PathVariable UUID intentId,
            @Valid @RequestBody ClaimRewardRequest req
    ) {
        Long userId = SecurityContextHelper.getRequiredUserId();
        try {
            ClaimRewardResponse resp = rewardedAdService.claimReward(intentId, userId, req);
            log.info("[REWARD_API] Claim: intentId={} userId={} idempotentReplay={} amount={}",
                intentId, userId, resp.idempotentReplay(), resp.grantedAmount());
            return ResponseEntity.ok(resp);
        } catch (RewardedAdService.RewardedAdNotFoundException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
        // RewardValidationException (incl. SESSION_CONFLICT) propagates to @ExceptionHandler.
    }

    // ── GET /wallet-summary ────────────────────────────────────────────────

    @GetMapping("/wallet-summary")
    public ResponseEntity<RewardWalletSummaryResponse> walletSummary() {
        Long userId = SecurityContextHelper.getRequiredUserId();
        return ResponseEntity.ok(rewardedAdService.getWalletSummary(userId));
    }

    // ── Exception handler ──────────────────────────────────────────────────

    @ExceptionHandler(RewardedAdValidationService.RewardValidationException.class)
    public ResponseEntity<ErrorBody> handleValidation(
            RewardedAdValidationService.RewardValidationException ex) {
        HttpStatus status = switch (ex.getCode()) {
            case "OWNERSHIP_MISMATCH"          -> HttpStatus.FORBIDDEN;
            case "DAILY_CAP_REACHED",
                 "HOURLY_CAP_REACHED",
                 "COOLDOWN_ACTIVE"             -> HttpStatus.TOO_MANY_REQUESTS;
            case "SESSION_CONFLICT"            -> HttpStatus.CONFLICT;
            case "INTENT_EXPIRED",
                 "ALREADY_CLAIMED",
                 "INTENT_TERMINAL",
                 "TOO_MANY_ACTIVE_INTENTS"     -> HttpStatus.CONFLICT;
            case "SESSION_REPLAY"              -> HttpStatus.CONFLICT;
            default                            -> HttpStatus.BAD_REQUEST;
        };
        return ResponseEntity.status(status).body(new ErrorBody(ex.getCode(), ex.getMessage()));
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private String extractClientIp(String forwardedFor, HttpServletRequest request) {
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String sanitizePage(String page) {
        if (page == null) return "/earn";
        String p = page.split("[?#]")[0];
        return p.length() > 256 ? p.substring(0, 256) : p;
    }

    private String sha256(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            return null;
        }
    }

    public record ErrorBody(String code, String message) {}
}
