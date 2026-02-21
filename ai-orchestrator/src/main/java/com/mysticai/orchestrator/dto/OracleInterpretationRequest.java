package com.mysticai.orchestrator.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Request DTO for the Oracle daily secret synthesis.
 * Carries all user context collected by oracle-service from downstream microservices.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record OracleInterpretationRequest(
        String name,
        String birthDate,
        String maritalStatus,
        String focusPoint,

        // Numerology
        Integer lifePathNumber,
        Integer destinyNumber,
        Integer soulUrgeNumber,

        // Natal chart
        String sunSign,
        String moonSign,
        String risingSign,

        // Today's sky
        String moonPhase,
        String moonSignToday,
        List<String> retrogradePlanets,

        // Recent dream (nullable)
        String dreamText,
        String dreamMood,
        String dreamInterpretation,

        // Prompt experimentation
        String promptVersion,
        String promptVariant
) {
}
