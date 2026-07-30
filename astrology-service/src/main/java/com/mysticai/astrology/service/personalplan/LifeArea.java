package com.mysticai.astrology.service.personalplan;

import java.util.Locale;

/**
 * The life areas a daily plan item can address. Houses map onto these; the plan never
 * emits a life area the transit data does not actually point at.
 */
public enum LifeArea {
    RELATIONSHIP("İlişkiler", "Relationships"),
    FAMILY("Aile", "Family"),
    SOCIAL("Sosyal çevre", "Social circle"),
    MONEY("Para", "Money"),
    WORK("İş ve sorumluluklar", "Work and responsibilities"),
    BOUNDARIES("Kişisel sınırlar", "Personal boundaries"),
    EMOTIONAL_BALANCE("Duygusal denge", "Emotional balance"),
    COMMUNICATION("İletişim", "Communication"),
    DECISION("Karar verme", "Decision making"),
    REST("Dinlenme", "Rest"),
    CREATIVITY("Yaratıcılık", "Creativity");

    private final String turkishLabel;
    private final String englishLabel;

    LifeArea(String turkishLabel, String englishLabel) {
        this.turkishLabel = turkishLabel;
        this.englishLabel = englishLabel;
    }

    public String label(boolean english) {
        return english ? englishLabel : turkishLabel;
    }

    /** Stable slug used in analytics payloads and duplicate fingerprints. */
    public String slug() {
        return name().toLowerCase(Locale.ROOT);
    }

    /**
     * Whole-sign style mapping from the natal house a transit falls in to the life area the
     * user actually experiences. Returns {@code null} when no house is known, so callers can
     * fall back to planet-driven areas instead of inventing one.
     */
    public static LifeArea fromHouse(String house) {
        if (house == null || house.isBlank()) {
            return null;
        }
        return switch (house.trim()) {
            case "1" -> BOUNDARIES;
            case "2" -> MONEY;
            case "3" -> COMMUNICATION;
            case "4" -> FAMILY;
            case "5" -> CREATIVITY;
            case "6" -> REST;
            case "7" -> RELATIONSHIP;
            case "8" -> MONEY;
            case "9" -> DECISION;
            case "10" -> WORK;
            case "11" -> SOCIAL;
            case "12" -> EMOTIONAL_BALANCE;
            default -> null;
        };
    }

    /** Used only when there is no house data (e.g. unknown birth time). */
    public static LifeArea fromTransitPlanet(String planet) {
        if (planet == null) {
            return EMOTIONAL_BALANCE;
        }
        return switch (planet.trim()) {
            case "Mercury" -> COMMUNICATION;
            case "Venus" -> RELATIONSHIP;
            case "Mars" -> BOUNDARIES;
            case "Jupiter" -> DECISION;
            case "Saturn" -> WORK;
            case "Moon" -> EMOTIONAL_BALANCE;
            case "Sun" -> BOUNDARIES;
            case "Neptune" -> REST;
            case "Uranus" -> SOCIAL;
            case "Pluto" -> MONEY;
            default -> EMOTIONAL_BALANCE;
        };
    }
}
