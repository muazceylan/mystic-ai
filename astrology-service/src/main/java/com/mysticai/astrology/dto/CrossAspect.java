package com.mysticai.astrology.dto;

/**
 * Represents a synastry aspect between a planet from Chart A (user) and Chart B (partner).
 */
public record CrossAspect(
        String userPlanet,
        String partnerPlanet,
        String aspectType,         // e.g. "TRINE", "SQUARE"
        String aspectSymbol,       // e.g. "△", "□"
        String aspectTurkish,      // e.g. "Üçgen", "Kare"
        double angle,
        double orb,
        boolean harmonious         // true = positive, false = challenging
) {}
