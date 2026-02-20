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
        String dailyVibe,
        LocalDateTime generatedAt,
        String message
) {
    public OracleResponse {
        if (generatedAt == null) {
            generatedAt = LocalDateTime.now();
        }
    }

    public OracleResponse(String secret, String numerologyInsight, String astrologyInsight,
                          String dreamInsight, String dailyVibe, String message) {
        this(secret, numerologyInsight, astrologyInsight, dreamInsight, dailyVibe, LocalDateTime.now(), message);
    }
}
