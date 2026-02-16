package com.mysticai.numerology.dto;

public record NumerologyResponse(
        String name,
        String birthDate,
        int lifePathNumber,
        int destinyNumber,
        int soulUrgeNumber,
        String summary
) {
}
