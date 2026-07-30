package com.mysticai.notification.service.rewarded;

import com.mysticai.notification.config.AyetCallbackProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * Optional HMAC verification for ayeT rewarded-video callbacks.
 *
 * DISABLED BY DEFAULT ({@code ayet.security.signature-verification-enabled=false}).
 *
 * IMPORTANT — DO NOT SHIP AN INVENTED ALGORITHM:
 * ayeT's official callback signing (canonical string, parameter order, digest and
 * encoding) MUST be taken from the ayeT panel / documentation and reflected in
 * {@link #canonicalString}. The HMAC-SHA256-over-transaction_id form below is a
 * placeholder wiring so the flag, secret plumbing, constant-time compare and logging
 * are all in place; confirm the exact scheme with ayeT before enabling in production.
 *
 * When the feature is disabled this component always returns {@code true} so it never
 * blocks the flow.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AyetSignatureVerifier {

    private final AyetCallbackProperties props;

    /**
     * @param providedSignature the signature/hash query param value from the callback
     * @param transactionId     provider transaction_id (part of the canonical string)
     * @param externalId        opaque external_identifier
     * @return true if verification passes OR is disabled; false if it fails
     */
    public boolean verify(String providedSignature, String transactionId, String externalId) {
        var sec = props.getSecurity();
        if (!sec.isSignatureVerificationEnabled()) {
            return true;
        }
        if (sec.getCallbackSecret() == null || sec.getCallbackSecret().isBlank()) {
            log.error("[AYET] Signature verification enabled but ayet.security.callback-secret is empty — rejecting.");
            return false;
        }
        if (providedSignature == null || providedSignature.isBlank()) {
            log.warn("[AYET] Signature verification enabled but callback carried no '{}' param.",
                    sec.getSignatureParam());
            return false;
        }

        String expected = hmacSha256Hex(sec.getCallbackSecret(),
                canonicalString(transactionId, externalId));
        boolean ok = constantTimeEquals(expected, providedSignature.trim());
        if (!ok) {
            // Never log secrets or the full external identifier.
            log.warn("[AYET] Signature mismatch for txn={} (external masked).", transactionId);
        }
        return ok;
    }

    /**
     * PLACEHOLDER canonical string — replace with ayeT's documented signing input.
     */
    private String canonicalString(String transactionId, String externalId) {
        return (transactionId == null ? "" : transactionId) + (externalId == null ? "" : externalId);
    }

    private String hmacSha256Hex(String secret, String message) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(message.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            log.error("[AYET] HMAC computation failed: {}", e.getMessage());
            return "";
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.isEmpty()) return false;
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8));
    }
}
