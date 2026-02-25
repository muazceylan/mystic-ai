package com.mysticai.astrology.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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
        String risingSign,
        List<PlanetPosition> planets,
        List<HousePlacement> houses,
        List<PlanetaryAspect> aspects,
        List<NatalPlanetComboInsight> planetComboInsights,
        List<NatalHouseComboInsight> houseComboInsights,
        String aiInterpretation,
        String interpretationStatus,
        LocalDateTime calculatedAt
) {}
