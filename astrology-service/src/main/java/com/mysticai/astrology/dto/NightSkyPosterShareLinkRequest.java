package com.mysticai.astrology.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Request to create a short-lived share token/link for birth-night sky poster.
 */
public record NightSkyPosterShareLinkRequest(
        Long userId,
        Long chartId,
        String name,
        LocalDate birthDate,
        LocalTime birthTime,
        String birthLocation,
        Double latitude,
        Double longitude,
        String timezone,
        String variant,
        Integer ttlHours
) {}

