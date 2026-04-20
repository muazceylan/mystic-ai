package com.mysticai.notification.entity.monetization;

/**
 * Lifecycle of a web rewarded-ad intent.
 *
 * PENDING      → AD_READY | CANCELLED | EXPIRED | FAILED
 * AD_READY     → AD_SHOWN | CANCELLED | EXPIRED
 * AD_SHOWN     → GRANTED  | CLOSED    | FAILED  | EXPIRED
 * GRANTED      → CLAIMED  | EXPIRED
 * CLAIMED      → (terminal — no further transitions)
 * CLOSED       → (terminal — ad closed without grant)
 * CANCELLED    → (terminal)
 * FAILED       → (terminal)
 * EXPIRED      → (terminal)
 */
public enum RewardIntentStatus {
    PENDING,
    AD_READY,
    AD_SHOWN,
    GRANTED,
    CLAIMED,
    CLOSED,
    CANCELLED,
    FAILED,
    EXPIRED
}
