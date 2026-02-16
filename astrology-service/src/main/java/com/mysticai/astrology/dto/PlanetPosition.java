package com.mysticai.astrology.dto;

/**
 * Record representing a planet's position in the zodiac.
 */
public record PlanetPosition(
        String planet,
        String sign,
        double degree,
        int minutes,
        int seconds,
        boolean retrograde,
        int house
) {}
