package com.mysticai.oracle.dto;

import java.util.List;

/**
 * Record representing natal chart data from Astrology Service.
 */
public record NatalChartData(
        String sunSign,
        String moonSign,
        String risingSign,
        List<PlanetPosition> planets,
        String aiInterpretation
) {
    /**
     * Record representing a planet's position in the natal chart.
     */
    public record PlanetPosition(
            String planet,
            String sign,
            int degree,
            String house
    ) {
    }
}
