package com.mysticai.astrology.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDate;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SkyPulseResponse(
        String moonSign,
        String moonSignTurkish,
        String moonSignSymbol,
        String moonPhase,
        List<String> retrogradePlanets,
        String dailyVibe,
        LocalDate date
) {}
