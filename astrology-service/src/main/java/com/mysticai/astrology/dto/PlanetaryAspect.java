package com.mysticai.astrology.dto;

/**
 * Record representing a planetary aspect between two planets.
 */
public record PlanetaryAspect(
        String planet1,
        String planet2,
        AspectType type,
        double angle,
        double orb
) {

    public enum AspectType {
        CONJUNCTION("Kavuşum", "☌", 0, 8),
        SQUARE("Kare", "□", 90, 8),
        TRINE("Üçgen", "△", 120, 8),
        OPPOSITION("Karşıt", "☍", 180, 8);

        private final String turkishName;
        private final String symbol;
        private final double exactAngle;
        private final double orbAllowance;

        AspectType(String turkishName, String symbol, double exactAngle, double orbAllowance) {
            this.turkishName = turkishName;
            this.symbol = symbol;
            this.exactAngle = exactAngle;
            this.orbAllowance = orbAllowance;
        }

        public String getTurkishName() { return turkishName; }
        public String getSymbol() { return symbol; }
        public double getExactAngle() { return exactAngle; }
        public double getOrbAllowance() { return orbAllowance; }
    }
}
