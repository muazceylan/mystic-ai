package com.mysticai.astrology.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record StarMateProfileResponse(
        Long id,
        Long userId,
        String bio,
        List<String> photos,
        String gender,
        String interestedIn,
        LocalDate birthDate,
        String locationLabel,
        Double latitude,
        Double longitude,
        Integer minCompatibilityAge,
        Integer maxCompatibilityAge,
        Boolean isActive,
        StarMatePreferencePayload preference,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
