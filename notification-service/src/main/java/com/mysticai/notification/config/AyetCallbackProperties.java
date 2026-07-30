package com.mysticai.notification.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Configuration for the ayeT Studios rewarded-video server-to-server callback.
 *
 * SECURITY MODEL:
 * - reward amount is ALWAYS {@link #rewardAmount} (server-side) — never taken from the callback.
 * - {@link #expectedCurrencyAmount} guards against tampered {@code currency_amount} values.
 * - {@link #placementIdentifier} / {@link #rewardedAdslotId} / {@link #currencyIdentifier}
 *   pin the callback to the exact ad unit we configured in the ayeT panel.
 * - Optional HMAC signature verification and IP allowlisting are BOTH disabled by default
 *   and toggled independently via {@link Security}.
 *
 * IMPORTANT: The HMAC canonical-string / parameter name must be confirmed against ayeT's
 * official callback documentation before enabling {@code signatureVerificationEnabled} in
 * production — do not invent a scheme. See {@code AyetSignatureVerifier}.
 */
@Component
@ConfigurationProperties(prefix = "ayet")
@Getter
@Setter
public class AyetCallbackProperties {

    /** Guru Tokens granted per successful rewarded video. */
    private int rewardAmount = 1;

    /** Expected provider {@code currency_amount}; mismatches are rejected + security-logged. */
    private int expectedCurrencyAmount = 1;

    /** Expected {@code placement_identifier}. Empty = do not enforce (dev only). */
    private String placementIdentifier = "";

    /** Expected {@code adslot_id}. Empty = do not enforce (dev only). */
    private String rewardedAdslotId = "";

    /** Expected {@code currency_identifier} label (e.g. "Guru Token"). Empty = do not enforce. */
    private String currencyIdentifier = "Guru Token";

    /** Reward session TTL in seconds (default 10 minutes). */
    private long sessionTtlSeconds = 600;

    /** Expired-session sweeper interval in ms. */
    private long cleanupIntervalMs = 300000;

    private final Security security = new Security();

    @Getter
    @Setter
    public static class Security {

        /**
         * When true, an HMAC signature query param is required and verified with
         * {@link #callbackSecret}. Default false — enable only after confirming ayeT's
         * official signing algorithm.
         */
        private boolean signatureVerificationEnabled = false;

        /** Shared secret configured in the ayeT panel. Never logged. */
        private String callbackSecret = "";

        /** Query-parameter name carrying the provider signature/hash. */
        private String signatureParam = "hash";

        /** When true, callbacks are only accepted from {@link #allowedIps}. Default false. */
        private boolean ipWhitelistEnabled = false;

        /** Allowed source IPs (exact match against the resolved client IP). */
        private List<String> allowedIps = List.of();

        public boolean isPlacementEnforced() {
            return false; // reserved; placement enforcement lives on the parent props
        }

        public boolean isIpAllowed(String ip) {
            if (!ipWhitelistEnabled) return true;
            if (ip == null || ip.isBlank()) return false;
            return allowedIps.contains(ip.trim());
        }
    }

    // ── Enforcement helpers (empty expected value = not enforced) ────────────

    public boolean isPlacementValid(String placement) {
        return placementIdentifier == null || placementIdentifier.isBlank()
                || placementIdentifier.equals(placement);
    }

    public boolean isAdslotValid(String adslot) {
        return rewardedAdslotId == null || rewardedAdslotId.isBlank()
                || rewardedAdslotId.equals(adslot);
    }

    public boolean isCurrencyIdentifierValid(String currency) {
        return currencyIdentifier == null || currencyIdentifier.isBlank()
                || currencyIdentifier.equals(currency);
    }

    public boolean isCurrencyAmountValid(int currencyAmount) {
        return currencyAmount == expectedCurrencyAmount;
    }
}
