package com.mysticai.astrology.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Record representing an astrological house placement.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record HousePlacement(
        int houseNumber,
        String sign,
        double degree,
        String ruler
) {}
