package com.mysticai.astrology.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record SavedPersonResponse(
        Long id,
        Long userId,
        String name,
        LocalDate birthDate,
        String birthTime,
        String birthLocation,
        Double latitude,
        Double longitude,
        String timezone,
        String relationshipCategory,
        String sunSign,
        String moonSign,
        String risingSign,
        List<PlanetPosition> planets,
        List<HousePlacement> houses,
        List<PlanetaryAspect> aspects,
        LocalDateTime createdAt
) {}
