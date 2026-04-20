package com.mysticai.notification.dto.rewarded;

/**
 * Snapshot of a user's Guru Token wallet status for the Earn page.
 * Includes daily cap info so frontend can disable the CTA when limit is reached.
 */
public record RewardWalletSummaryResponse(
        int currentBalance,
        long lifetimeEarned,
        int dailyEarnedToday,
        int dailyLimit,
        int remainingToday,
        boolean dailyCapReached,
        int rewardAmountPerAd,
        boolean rewardedAdsEnabled
) {}
