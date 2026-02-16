package com.mysticai.astrology.dto;

/**
 * Record representing an astrological house placement.
 */
public record HousePlacement(
        int houseNumber,
        String sign,
        double degree,
        String ruler
) {}
