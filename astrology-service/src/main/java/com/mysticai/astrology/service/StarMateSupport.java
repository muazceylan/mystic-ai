package com.mysticai.astrology.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.StarMatePreferencePayload;
import com.mysticai.astrology.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.Period;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

@Component
@RequiredArgsConstructor
public class StarMateSupport {

    private final ObjectMapper objectMapper;

    public List<String> parsePhotos(String photosJson) {
        if (photosJson == null || photosJson.isBlank()) return List.of();
        try {
            return objectMapper.readValue(
                    photosJson,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)
            );
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    public String toPhotosJson(List<String> photos) {
        try {
            List<String> sanitized = photos == null ? List.of() : photos.stream()
                    .filter(s -> s != null && !s.isBlank())
                    .map(String::trim)
                    .toList();
            return objectMapper.writeValueAsString(sanitized);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    public StarMateLikeType parseActionType(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("actionType is required");
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        if ("NOPE".equals(normalized)) {
            return StarMateLikeType.DISLIKE;
        }
        try {
            return StarMateLikeType.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unsupported actionType: " + raw);
        }
    }

    public StarMateShowMe parseShowMe(String raw, StarMateShowMe fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        try {
            return StarMateShowMe.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return fallback;
        }
    }

    public StarMateGender parseGender(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return StarMateGender.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return StarMateGender.OTHER;
        }
    }

    public int age(LocalDate birthDate) {
        if (birthDate == null) return 0;
        return Math.max(0, Period.between(birthDate, LocalDate.now()).getYears());
    }

    public LocalDate oldestBirthDateForAge(int maxAge) {
        return LocalDate.now().minusYears(maxAge + 1L).plusDays(1);
    }

    public LocalDate youngestBirthDateForAge(int minAge) {
        return LocalDate.now().minusYears(minAge);
    }

    public double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double earthRadiusKm = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }

    public boolean matchesViewerPreference(StarMateShowMe showMe, StarMateGender candidateGender) {
        if (showMe == null || showMe == StarMateShowMe.EVERYONE) return true;
        if (candidateGender == null) return false;
        return switch (showMe) {
            case MEN -> candidateGender == StarMateGender.MAN;
            case WOMEN -> candidateGender == StarMateGender.WOMAN;
            case EVERYONE -> true;
        };
    }

    public boolean candidateAcceptsViewer(StarMateShowMe candidateInterestedIn, StarMateGender viewerGender) {
        if (candidateInterestedIn == null || candidateInterestedIn == StarMateShowMe.EVERYONE) return true;
        if (viewerGender == null) return true;
        return switch (candidateInterestedIn) {
            case MEN -> viewerGender == StarMateGender.MAN;
            case WOMEN -> viewerGender == StarMateGender.WOMAN;
            case EVERYONE -> true;
        };
    }

    public StarMatePreference buildDefaultPreference(Long userId) {
        return StarMatePreference.builder()
                .userId(userId)
                .maxDistanceKm(100)
                .minAge(18)
                .maxAge(99)
                .minCompatibilityScore(50)
                .showMe(StarMateShowMe.EVERYONE)
                .strictDistance(false)
                .strictAge(true)
                .build();
    }

    public StarMatePreferencePayload toPreferencePayload(StarMatePreference preference) {
        if (preference == null) return null;
        return new StarMatePreferencePayload(
                preference.getMaxDistanceKm(),
                preference.getMinAge(),
                preference.getMaxAge(),
                preference.getMinCompatibilityScore(),
                preference.getShowMe() != null ? preference.getShowMe().name() : null,
                preference.isStrictDistance(),
                preference.isStrictAge()
        );
    }

    public String safeName(String raw) {
        if (raw == null || raw.isBlank()) return "Mistik Aday";
        return raw.trim();
    }

    public List<String> immutableListOrEmpty(List<String> list) {
        return list == null ? List.of() : Collections.unmodifiableList(list);
    }
}
