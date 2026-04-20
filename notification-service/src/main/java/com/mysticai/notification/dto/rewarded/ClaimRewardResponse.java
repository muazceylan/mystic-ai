package com.mysticai.notification.dto.rewarded;

import java.util.UUID;

/**
 * Returned after a reward claim (new or idempotent replay).
 *
 * idempotentReplay=true  → same fingerprint, claim already processed; no new tokens.
 * idempotentReplay=false → fresh claim; tokens credited now.
 *
 * Frontend uses idempotentReplay to show the appropriate message:
 *   false → "Token kazandın! (+X Guru Token)"
 *   true  → "Bu ödül daha önce hesabına eklenmiştir."
 */
public record ClaimRewardResponse(
        boolean success,
        int walletBalance,
        int grantedAmount,
        String rewardType,
        String ledgerEntryId,
        String message,
        /** True when the same fingerprint was already claimed; tokens NOT double-credited. */
        boolean idempotentReplay
) {
    /** Convenience factory for safe idempotent re-delivery (same fingerprint). */
    public static ClaimRewardResponse idempotentReplay(int balance, int amount, UUID ledgerEntryId) {
        return new ClaimRewardResponse(
                true,
                balance,
                amount,
                "GURU_TOKEN",
                ledgerEntryId != null ? ledgerEntryId.toString() : null,
                "Bu ödül daha önce hesabına eklenmiştir. Bakiyen değişmedi.",
                true
        );
    }

    /** Convenience factory for a fresh claim. */
    public static ClaimRewardResponse fresh(int balance, int grantedAmount, String ledgerId) {
        return new ClaimRewardResponse(
                true,
                balance,
                grantedAmount,
                "GURU_TOKEN",
                ledgerId,
                "+" + grantedAmount + " Guru Token hesabına eklendi.",
                false
        );
    }
}
