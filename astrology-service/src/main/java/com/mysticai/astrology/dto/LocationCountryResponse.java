package com.mysticai.astrology.dto;

public record LocationCountryResponse(
        String code,
        String name,
        int cityCount
) {
}
