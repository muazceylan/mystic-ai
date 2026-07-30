package com.mysticai.astrology.service.personalplan;

/**
 * The behavioural flavour a transiting planet brings. Catalog variants are indexed by role
 * so the same life area produces a different concrete suggestion under Mercury than under
 * Saturn instead of one interchangeable sentence.
 */
public enum PlanetRole {
    /** Mercury: wording, information, what was actually said vs. what was heard. */
    WORD,
    /** Venus / Moon: closeness, comfort, what someone needs from you. */
    BOND,
    /** Mars / Sun: pace, initiative, friction, visibility. */
    DRIVE,
    /** Saturn / Pluto: limits, commitments, what you are agreeing to carry. */
    LIMIT,
    /** Jupiter / Uranus / Neptune: scope, expansion, unclear edges. */
    SCOPE;

    public static PlanetRole fromPlanet(String planet) {
        if (planet == null) {
            return BOND;
        }
        return switch (planet.trim()) {
            case "Mercury" -> WORD;
            case "Venus", "Moon" -> BOND;
            case "Mars", "Sun" -> DRIVE;
            case "Saturn", "Pluto" -> LIMIT;
            case "Jupiter", "Uranus", "Neptune", "Chiron", "NorthNode" -> SCOPE;
            default -> BOND;
        };
    }
}
