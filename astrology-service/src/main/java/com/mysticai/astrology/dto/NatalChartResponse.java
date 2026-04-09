package com.mysticai.astrology.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Response record for detailed natal chart calculation.
 */
public record NatalChartResponse(
        Long id,
        Long userId,
        String name,
        LocalDate birthDate,
        String birthTime,
        String birthLocation,
        double latitude,
        double longitude,
        String sunSign,
        String moonSign,
        /** Null when birth time is unknown — rising sign changes every ~2 hours. */
        String risingSign,
        List<PlanetPosition> planets,
        List<HousePlacement> houses,
        List<PlanetaryAspect> aspects,
        List<NatalPlanetComboInsight> planetComboInsights,
        List<NatalHouseComboInsight> houseComboInsights,
        String aiInterpretation,
        String interpretationStatus,
        LocalDateTime calculatedAt,
        /** Ruling planet of the Ascendant sign (modern rulership). Null when risingSign is null. */
        String chartRuler,
        /** Count of the 10 traditional planets by element: Fire, Earth, Air, Water. */
        Map<String, Integer> elementDistribution,
        /** Count of the 10 traditional planets by mode: Cardinal, Fixed, Mutable. */
        Map<String, Integer> modeDistribution,
        /** False when birth time was not provided — rising sign and house cusps are approximate. */
        boolean birthTimeKnown
) {}
