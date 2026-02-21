package com.mysticai.oracle.dto;

import java.time.LocalDateTime;
import java.util.List;

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
        String transitHeadline,
        String transitSummary,
        List<String> transitPoints,
        String promptVersion,
        String promptVariant,
        Integer readabilityScore,
        Integer impactScore,
        LocalDateTime generatedAt,
        String message
) {
    public OracleResponse {
        if (transitPoints == null) {
            transitPoints = List.of();
        }
        if (generatedAt == null) {
            generatedAt = LocalDateTime.now();
        }
    }

    public OracleResponse(String secret, String numerologyInsight, String astrologyInsight,
                          String dreamInsight, String dailyVibe, String message) {
        this(secret, numerologyInsight, astrologyInsight, dreamInsight, dailyVibe,
                null, null, List.of(), null, null, null, null, LocalDateTime.now(), message);
    }

    public OracleResponse(String secret, String numerologyInsight, String astrologyInsight,
                          String dreamInsight, String dailyVibe,
                          String transitHeadline, String transitSummary, List<String> transitPoints,
                          String promptVersion, String promptVariant, Integer readabilityScore, Integer impactScore,
                          String message) {
        this(secret, numerologyInsight, astrologyInsight, dreamInsight, dailyVibe,
                transitHeadline, transitSummary, transitPoints, promptVersion, promptVariant,
                readabilityScore, impactScore, LocalDateTime.now(), message);
    }
}
