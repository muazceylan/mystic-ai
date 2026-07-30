package com.mysticai.notification.entity.monetization;

/**
 * Lifecycle of a provider reward session.
 *
 * CREATED  → REWARDED | EXPIRED | REJECTED
 * REWARDED  → (terminal — token already granted, single use)
 * EXPIRED   → (terminal — TTL elapsed before a valid callback arrived)
 * REJECTED  → (terminal — a callback referenced it but failed validation)
 */
public enum RewardSessionStatus {
    CREATED,
    REWARDED,
    EXPIRED,
    REJECTED
}
