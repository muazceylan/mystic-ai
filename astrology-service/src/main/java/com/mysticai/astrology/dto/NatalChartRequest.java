package com.mysticai.astrology.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;

import java.time.LocalDateTime;

public record NatalChartRequest(
        @NotNull(message = "User ID is required")
        Long userId,

        @NotNull(message = "Birth date is required")
        @Past(message = "Birth date must be in the past")
        LocalDateTime birthDate,

        String birthPlace,

        Double birthLatitude,

        Double birthLongitude
) {
}
