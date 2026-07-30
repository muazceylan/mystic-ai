package com.mysticai.notification.dto.rewarded;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Returned after a reward session is created. {@code externalIdentifier} equals
 * {@code sessionId} and is what the frontend passes to the provider SDK so the
 * provider echoes it back on the S2S callback.
 */
public record CreateRewardSessionResponse(
        UUID sessionId,
        UUID externalIdentifier,
        int rewardAmount,
        LocalDateTime expiresAt
) {}
