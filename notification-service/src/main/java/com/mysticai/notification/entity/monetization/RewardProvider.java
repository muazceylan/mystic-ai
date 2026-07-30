package com.mysticai.notification.entity.monetization;

/**
 * External rewarded-ad / offerwall provider whose server-to-server callbacks
 * credit Guru Tokens.
 *
 * Currently only ayeT Studios (web rewarded video). New providers are added
 * here rather than by creating a parallel session/event model.
 */
public enum RewardProvider {
    AYET,
    LEVELPLAY
}
