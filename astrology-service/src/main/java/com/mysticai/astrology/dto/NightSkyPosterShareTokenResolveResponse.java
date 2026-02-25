package com.mysticai.astrology.dto;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Public read model for a poster share token.
 */
public record NightSkyPosterShareTokenResolveResponse(
        String token,
        String posterType,
        String variant,
        boolean expired,
        LocalDateTime expiresAt,
        LocalDateTime createdAt,
        Map<String, Object> payload
) {}

