package com.mysticai.orchestrator.dto;

/**
 * Request payload sent from numerology-service to ai-orchestrator.
 * Contains the user's core numerology numbers and current timing context.
 */
public record NumerologyGuidanceRequest(
        String name,
        int lifePathNumber,
        int birthdayNumber,
        int destinyNumber,
        int soulUrgeNumber,
        int personalYear,
        int personalMonth,
        int personalDay,
        int dominantNumber,
        String yearPhase,
        String locale,
        String guidancePeriod
) {
}
