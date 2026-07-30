package com.mysticai.notification.controller;

import com.mysticai.notification.dto.rewarded.AyetCallbackParams;
import com.mysticai.notification.service.rewarded.AyetRewardCallbackService;
import com.mysticai.notification.service.rewarded.AyetRewardCallbackService.CallbackResult;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

/**
 * Public ayeT Studios rewarded-video server-to-server callback.
 *
 * URL (through the API gateway):  GET /api/v1/webhooks/ayet/rewarded-video
 *
 * AUTH: intentionally unauthenticated (ayeT's servers cannot present a user JWT).
 * It is defended instead by:
 *   - the opaque, single-use, user-bound reward-session external_identifier,
 *   - server-side reward amount + placement/adslot/currency pinning,
 *   - optional HMAC signature and IP allowlist (config-gated, off by default).
 *
 * HTTP contract:
 *   - success / duplicate → 200 "OK"
 *   - missing param       → 400 (Spring MissingServletRequestParameterException)
 *   - invalid placement/adslot/signature/IP → 403
 *   - invalid session / currency_amount     → 400
 *   - unexpected error    → 500
 */
@RestController
@RequestMapping("/api/v1/webhooks/ayet")
@RequiredArgsConstructor
@Slf4j
public class AyetRewardedVideoWebhookController {

    private final AyetRewardCallbackService callbackService;

    @GetMapping(value = "/rewarded-video", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> rewardedVideo(
            @RequestParam("transaction_id") String transactionId,
            @RequestParam("external_identifier") String externalIdentifier,
            @RequestParam("currency_amount") String currencyAmountRaw,
            @RequestParam("payout_usd") String payoutUsdRaw,
            @RequestParam("placement_identifier") String placementIdentifier,
            @RequestParam("adslot_id") String adslotId,
            @RequestParam("currency_identifier") String currencyIdentifier,
            @RequestParam(value = "sub_id", required = false) String subId,
            @RequestParam(value = "hash", required = false) String signature,
            HttpServletRequest request) {

        // Parse numeric fields defensively → malformed values are 400, never a grant.
        int currencyAmount;
        BigDecimal payoutUsd;
        try {
            currencyAmount = Integer.parseInt(currencyAmountRaw.trim());
        } catch (NumberFormatException e) {
            log.warn("[AYET] Non-numeric currency_amount='{}' txn={}", currencyAmountRaw, transactionId);
            return ResponseEntity.badRequest().body("BAD_CURRENCY_AMOUNT");
        }
        try {
            payoutUsd = new BigDecimal(payoutUsdRaw.trim());
        } catch (NumberFormatException e) {
            log.warn("[AYET] Non-numeric payout_usd='{}' txn={}", payoutUsdRaw, transactionId);
            return ResponseEntity.badRequest().body("BAD_PAYOUT_USD");
        }

        String clientIp = extractClientIp(request);
        log.info("[AYET] Callback received: txn={} external={} placement={} adslot={} currencyAmount={}",
                transactionId, mask(externalIdentifier), placementIdentifier, adslotId, currencyAmount);

        AyetCallbackParams params = new AyetCallbackParams(
                transactionId, externalIdentifier, currencyAmount, payoutUsd,
                placementIdentifier, adslotId, currencyIdentifier, subId, signature, clientIp);

        CallbackResult result = callbackService.handle(params);

        return switch (result.outcome()) {
            case PROCESSED, DUPLICATE -> ResponseEntity.ok("OK");
            case REJECTED_BAD_REQUEST -> ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result.code());
            case REJECTED_FORBIDDEN   -> ResponseEntity.status(HttpStatus.FORBIDDEN).body(result.code());
            case ERROR                -> ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("ERROR");
        };
    }

    /** Masks all but the last 4 chars of the opaque external_identifier for logs. */
    private String mask(String value) {
        if (value == null || value.length() <= 4) return "****";
        return "****" + value.substring(value.length() - 4);
    }

    private String extractClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
