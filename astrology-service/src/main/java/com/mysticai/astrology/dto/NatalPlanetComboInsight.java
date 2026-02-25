package com.mysticai.astrology.dto;

import java.util.List;

/**
 * Backend-generated line-by-line insight for a planet + sign + house combination.
 */
public record NatalPlanetComboInsight(
        String planet,
        String sign,
        int house,
        String tripleLabel,
        String summary,
        String characterLine,
        String effectLine,
        String cautionLine,
        List<String> strengths
) {}
