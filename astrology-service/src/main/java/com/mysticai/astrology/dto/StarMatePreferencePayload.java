package com.mysticai.astrology.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record StarMatePreferencePayload(
        @Min(1) @Max(500) Integer maxDistanceKm,
        @Min(18) @Max(99) Integer minAge,
        @Min(18) @Max(99) Integer maxAge,
        @Min(0) @Max(100) Integer minCompatibilityScore,
        String showMe,
        Boolean strictDistance,
        Boolean strictAge
) {}
