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
        /** IANA timezone, e.g. Europe/Istanbul */
        String timezone,
        /** Backward-compatible field: LOVE, BUSINESS, FRIENDSHIP, RIVAL, FAMILY */
        String relationshipCategory,
        /** Preferred field name for mobile companion flow */
        String relationshipType
) {}
