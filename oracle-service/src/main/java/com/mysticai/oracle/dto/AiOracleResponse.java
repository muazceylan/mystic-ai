package com.mysticai.oracle.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Parsed representation of the AI Orchestrator's JSON response for oracle synthesis.
 * Used only internally in OracleService to deserialize the AI output before mapping to OracleResponse.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AiOracleResponse(
        String secret,
        String numerologyInsight,
        String astrologyInsight,
        String dreamInsight,
        String dailyVibe,
        String transitHeadline,
        String transitSummary,
        List<String> transitPoints,
        String message,
        String promptVersion,
        String promptVariant,
        Integer readabilityScore,
        Integer impactScore
) {
}
