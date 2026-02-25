package com.mysticai.astrology.dto;

import java.time.LocalDateTime;

/**
 * Response for poster share link creation.
 */
public record NightSkyPosterShareLinkResponse(
        String token,
        String variant,
        String shareUrl,
        String apiResolveUrl,
        LocalDateTime expiresAt
) {}

