package com.mysticai.oracle.dto;

/**
 * Record representing numerology data from Numerology Service.
 */
public record NumerologyData(
        Integer lifePathNumber,
        Integer soulUrgeNumber,
        Integer destinyNumber,
        String summary
) {
}
