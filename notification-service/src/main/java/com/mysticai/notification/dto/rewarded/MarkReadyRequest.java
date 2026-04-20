package com.mysticai.notification.dto.rewarded;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Sent when the GPT rewardedSlotReady event fires in the browser.
 * Transitions intent to AD_READY; updates adSessionId for later claim validation.
 */
public record MarkReadyRequest(
        @NotBlank
        @Size(max = 256)
        String adSessionId,

        @Size(max = 128)
        String clientEventId
) {}
