package com.mysticai.astrology.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record StarMateProfileRequest(
        @NotNull Long userId,
        String bio,
        List<String> photos,
        String gender,
        String interestedIn,
        @NotNull LocalDate birthDate,
        String locationLabel,
        Double latitude,
        Double longitude,
        @Min(18) @Max(99) Integer minCompatibilityAge,
        @Min(18) @Max(99) Integer maxCompatibilityAge,
        Boolean isActive,
        @Valid StarMatePreferencePayload preference
) {}
