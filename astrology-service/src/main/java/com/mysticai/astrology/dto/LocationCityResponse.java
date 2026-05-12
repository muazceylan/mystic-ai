package com.mysticai.astrology.dto;

public record LocationCityResponse(
        String name,
        String timezone,
        Double latitude,
        Double longitude
) {
}
