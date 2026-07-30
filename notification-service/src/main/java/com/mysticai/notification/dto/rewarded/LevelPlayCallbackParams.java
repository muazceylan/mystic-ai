package com.mysticai.notification.dto.rewarded;

public record LevelPlayCallbackParams(
        String timestamp,
        String eventId,
        String userId,
        int rewards,
        String signature,
        String rewardSessionId,
        String placementName,
        String adNetwork,
        String auctionId
) {}
