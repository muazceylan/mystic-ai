package com.mysticai.oracle.dto;

import java.time.LocalDateTime;

/**
 * Record representing the Grand Synthesis - the mystical secret of the day.
 * Combines data from Numerology, Astrology (Natal Chart), and Dreams.
 */
public record OracleResponse(
        String secret,
        String numerologyInsight,
        String astrologyInsight,
        String dreamInsight,
        LocalDateTime generatedAt,
        String message
) {
    public OracleResponse {
        if (generatedAt == null) {
            generatedAt = LocalDateTime.now();
        }
    }

    public OracleResponse(String secret, String numerologyInsight, String astrologyInsight, 
                         String dreamInsight, String message) {
        this(secret, numerologyInsight, astrologyInsight, dreamInsight, LocalDateTime.now(), message);
    }
}
