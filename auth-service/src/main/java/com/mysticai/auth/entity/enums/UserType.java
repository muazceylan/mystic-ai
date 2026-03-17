package com.mysticai.auth.entity.enums;

/**
 * Distinguishes between guest (anonymous) sessions and fully registered accounts.
 * GUEST users can use all features (Phase 1) but can later link their account.
 * REGISTERED users have completed authentication via email, Google, or Apple.
 */
public enum UserType {
    GUEST,
    REGISTERED
}
