package com.mysticai.astrology.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Request payload for high-precision birth-night sky projection.
 * Uses Swiss Ephemeris and horizontal coordinates (azimuth/altitude).
 */
public record NightSkyProjectionRequest(
        Long userId,
        Long chartId,
        String name,
        LocalDate birthDate,
        LocalTime birthTime,
        String birthLocation,
        Double latitude,
        Double longitude,
        String timezone,
        Double elevationMeters
) {}

