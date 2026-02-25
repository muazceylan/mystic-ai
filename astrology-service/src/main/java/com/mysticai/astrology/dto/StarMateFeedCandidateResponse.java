package com.mysticai.astrology.dto;

import java.util.List;

public record StarMateFeedCandidateResponse(
        Long userId,
        Long profileId,
        String displayName,
        Integer age,
        String gender,
        String sunSign,
        String moonSign,
        String risingSign,
        String locationLabel,
        Double distanceKm,
        Integer compatibilityScore,
        String compatibilitySummary,
        List<String> photos
) {}
