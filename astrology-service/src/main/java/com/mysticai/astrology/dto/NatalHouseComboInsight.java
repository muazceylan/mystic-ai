package com.mysticai.astrology.dto;

import java.util.List;

/**
 * Backend-generated line-by-line insight for a house + sign + resident planets combination.
 */
public record NatalHouseComboInsight(
        int houseNumber,
        String sign,
        String introLine,
        String characterLine,
        String effectLine,
        String cautionLine,
        List<String> strengths,
        String comboSummary,
        List<String> residentPlanets
) {}
