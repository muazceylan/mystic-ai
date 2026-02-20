package com.mysticai.astrology.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record SavedPersonRequest(
        @NotNull Long userId,
        @NotBlank String name,
        @NotNull LocalDate birthDate,
        LocalTime birthTime,
        @NotBlank String birthLocation,
        /** Optional: if null, lat/lon is auto-resolved from birthLocation */
        Double latitude,
        Double longitude,
        /** LOVE, BUSINESS, FRIENDSHIP, RIVAL */
        String relationshipCategory
) {}
