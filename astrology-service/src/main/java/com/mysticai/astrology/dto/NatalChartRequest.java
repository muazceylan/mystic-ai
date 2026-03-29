package com.mysticai.astrology.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Request record for natal chart calculation.
 */
public record NatalChartRequest(
        @NotNull(message = "User ID is required")
        Long userId,

        String name,

        @NotNull(message = "Birth date is required")
        @Past(message = "Birth date must be in the past")
        LocalDate birthDate,

        LocalTime birthTime,

        @NotBlank(message = "Birth location is required")
        String birthLocation,

        Double latitude,

        Double longitude,

        String timezone,

        String locale
) {}
