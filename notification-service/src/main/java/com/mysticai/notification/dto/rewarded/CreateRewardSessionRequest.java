package com.mysticai.notification.dto.rewarded;

import jakarta.validation.constraints.Size;

/**
 * Request to mint an opaque reward session for a provider S2S rewarded-ad flow.
 * userId is taken from the authenticated principal, never from the body.
 *
 * All fields optional with safe defaults (provider=AYET, channel=WEB).
 */
public record CreateRewardSessionRequest(
        @Size(max = 40) String provider,
        @Size(max = 40) String channel,
        @Size(max = 80) String placement
) {}
