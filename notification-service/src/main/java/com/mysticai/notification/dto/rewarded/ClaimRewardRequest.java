package com.mysticai.notification.dto.rewarded;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Sent by the frontend after GPT fires the rewardedSlotGranted event.
 * Backend validates all fields before crediting tokens.
 */
public record ClaimRewardRequest(
        /**
         * GPT session id from the rewardedSlotGranted event payload.
         * Used for replay-attack detection (same session can't be claimed twice).
         */
        @NotBlank
        @Size(max = 256)
        String adSessionId,

        /**
         * A nonce generated on the browser before the ad was shown.
         * Stored in the intent; compared on claim to prevent cross-tab replay.
         */
        @NotBlank
        @Size(max = 128)
        String clientEventId,

        /** Normalized page URL (e.g. "/earn"). */
        @Size(max = 512)
        String pageContext,

        /** Raw User-Agent string — backend hashes and compares with intent. */
        @Size(max = 512)
        String userAgentSnapshot,

        /**
         * Summary of the GPT reward payload JSON from rewardedSlotGranted.
         * Backend does NOT use this to determine the reward amount —
         * amount is taken from the persisted intent. Stored for audit.
         */
        @Size(max = 1024)
        String grantedPayloadSummary
) {}
