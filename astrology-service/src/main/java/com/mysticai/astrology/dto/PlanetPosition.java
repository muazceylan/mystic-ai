package com.mysticai.astrology.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Record representing a planet's position in the zodiac.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PlanetPosition(
        String planet,
        String sign,
        double degree,
        int minutes,
        int seconds,
        boolean retrograde,
        int house,
        double absoluteLongitude
) {
    /**
     * Backward-compatible constructor (without absoluteLongitude).
     * Used when deserializing old data from DB.
     */
    public PlanetPosition(String planet, String sign, double degree, int minutes, int seconds,
                          boolean retrograde, int house) {
        this(planet, sign, degree, minutes, seconds, retrograde, house, 0.0);
    }
}
