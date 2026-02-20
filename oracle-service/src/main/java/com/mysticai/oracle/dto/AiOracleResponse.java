package com.mysticai.oracle.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

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
        String message
) {
}
