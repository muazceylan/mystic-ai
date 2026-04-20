package com.mysticai.notification.dto.rewarded;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Returned after a reward intent is successfully created.
 * The frontend uses intentId + adConfig to set up the GPT rewarded slot.
 */
public record CreateRewardIntentResponse(
        UUID intentId,
        int rewardAmount,
        String rewardType,
        LocalDateTime expiresAt,
        AdConfig adConfig
) {
    public record AdConfig(
            String adUnitPath,
            boolean supported,
            String placementKey
    ) {}
}
