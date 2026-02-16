package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.HousePlacement;
import com.mysticai.astrology.dto.PlanetPosition;
import com.mysticai.astrology.dto.PlanetaryAspect;
import com.mysticai.astrology.dto.PlanetaryAspect.AspectType;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Service for calculating natal chart (birth chart) positions.
 * Simulates astrological calculations for planet positions and house placements.
 * In production, this would integrate with Swiss Ephemeris or similar library.
 */
@Service
public class NatalChartCalculator {

    private static final String[] PLANETS = {
            "Sun", "Moon", "Mercury", "Venus", "Mars",
            "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"
    };

    private static final String[] SIGNS = {
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    };

    private static final String[] SIGN_RULERS = {
            "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
            "Venus", "Pluto", "Jupiter", "Saturn", "Uranus", "Neptune"
    };

    /**
     * Calculate all planet positions for a given birth date/time/location.
     */
    public List<PlanetPosition> calculatePlanetPositions(
            LocalDate birthDate,
            LocalTime birthTime,
            double latitude,
            double longitude
    ) {
        List<PlanetPosition> positions = new ArrayList<>();

        // Use birth data to generate deterministic but unique positions
        long seed = birthDate.toEpochDay() + birthTime.toSecondOfDay() + (long)(latitude * 1000);

        for (int i = 0; i < PLANETS.length; i++) {
            String planet = PLANETS[i];

            // Calculate sign based on birth date + planet offset
            int signIndex = (int)((seed + i * 30) % 12);
            String sign = SIGNS[signIndex];

            // Calculate degree (0-29)
            double degree = ((seed + i * 17) % 30);
            int deg = (int) degree;
            int minutes = (int) ((degree - deg) * 60);
            int seconds = (int) (((degree - deg) * 60 - minutes) * 60);

            // Determine retrograde status
            boolean retrograde = ((seed + i) % 7) == 0; // ~14% chance

            // Calculate house placement (1-12)
            int house = ((int)((seed + i * 5) % 12)) + 1;

            positions.add(new PlanetPosition(
                    planet,
                    sign,
                    deg,
                    minutes,
                    seconds,
                    retrograde,
                    house
            ));
        }

        return positions;
    }

    /**
     * Calculate house cusps (Ascendant and 12 houses).
     */
    public List<HousePlacement> calculateHouses(
            LocalDate birthDate,
            LocalTime birthTime,
            double latitude,
            double longitude
    ) {
        List<HousePlacement> houses = new ArrayList<>();

        // Generate deterministic seed
        long seed = birthDate.toEpochDay() + birthTime.toSecondOfDay() + (long)(longitude * 1000);

        for (int i = 1; i <= 12; i++) {
            int signIndex = (int)((seed + i * 25) % 12);
            String sign = SIGNS[signIndex];
            double degree = ((seed + i * 13) % 30);

            houses.add(new HousePlacement(
                    i,
                    sign,
                    degree,
                    SIGN_RULERS[signIndex]
            ));
        }

        return houses;
    }

    /**
     * Calculate the Ascendant (Rising Sign).
     */
    public String calculateAscendant(
            LocalDate birthDate,
            LocalTime birthTime,
            double latitude,
            double longitude
    ) {
        long seed = birthDate.toEpochDay() + birthTime.toSecondOfDay() + (long)(latitude * 100 + longitude);
        int signIndex = (int)(seed % 12);
        return SIGNS[signIndex];
    }

    /**
     * Get Sun sign based on birth date.
     */
    public String calculateSunSign(LocalDate birthDate) {
        int month = birthDate.getMonthValue();
        int day = birthDate.getDayOfMonth();

        return switch (month) {
            case 1 -> (day <= 19) ? "Capricorn" : "Aquarius";
            case 2 -> (day <= 18) ? "Aquarius" : "Pisces";
            case 3 -> (day <= 20) ? "Pisces" : "Aries";
            case 4 -> (day <= 19) ? "Aries" : "Taurus";
            case 5 -> (day <= 20) ? "Taurus" : "Gemini";
            case 6 -> (day <= 20) ? "Gemini" : "Cancer";
            case 7 -> (day <= 22) ? "Cancer" : "Leo";
            case 8 -> (day <= 22) ? "Leo" : "Virgo";
            case 9 -> (day <= 22) ? "Virgo" : "Libra";
            case 10 -> (day <= 22) ? "Libra" : "Scorpio";
            case 11 -> (day <= 21) ? "Scorpio" : "Sagittarius";
            case 12 -> (day <= 21) ? "Sagittarius" : "Capricorn";
            default -> "Unknown";
        };
    }

    /**
     * Get Moon sign (simplified calculation).
     */
    public String calculateMoonSign(LocalDate birthDate) {
        // Moon changes sign every ~2.5 days
        long daysSinceEpoch = birthDate.toEpochDay();
        int signIndex = (int)((daysSinceEpoch % 27) / 2.25) % 12;
        return SIGNS[signIndex];
    }

    /**
     * Calculate planetary aspects between all planet pairs.
     * Identifies Conjunction (0°±8°), Square (90°±8°), Trine (120°±8°), Opposition (180°±8°).
     */
    public List<PlanetaryAspect> calculateAspects(List<PlanetPosition> planets) {
        List<PlanetaryAspect> aspects = new ArrayList<>();

        for (int i = 0; i < planets.size(); i++) {
            for (int j = i + 1; j < planets.size(); j++) {
                PlanetPosition p1 = planets.get(i);
                PlanetPosition p2 = planets.get(j);

                double absoluteLong1 = getAbsoluteLongitude(p1);
                double absoluteLong2 = getAbsoluteLongitude(p2);

                double angle = Math.abs(absoluteLong1 - absoluteLong2);
                if (angle > 180) {
                    angle = 360 - angle;
                }

                for (AspectType type : AspectType.values()) {
                    double orb = Math.abs(angle - type.getExactAngle());
                    if (orb <= type.getOrbAllowance()) {
                        aspects.add(new PlanetaryAspect(
                                p1.planet(),
                                p2.planet(),
                                type,
                                Math.round(angle * 100.0) / 100.0,
                                Math.round(orb * 100.0) / 100.0
                        ));
                        break; // one aspect per planet pair
                    }
                }
            }
        }

        return aspects;
    }

    /**
     * Convert a planet's sign + degree into absolute ecliptic longitude (0-360°).
     */
    private double getAbsoluteLongitude(PlanetPosition planet) {
        int signIndex = getSignIndex(planet.sign());
        return signIndex * 30.0 + planet.degree() + planet.minutes() / 60.0 + planet.seconds() / 3600.0;
    }

    private int getSignIndex(String sign) {
        for (int i = 0; i < SIGNS.length; i++) {
            if (SIGNS[i].equalsIgnoreCase(sign)) return i;
        }
        return 0;
    }

    /**
     * Parse location string to latitude/longitude.
     * In production, this would use a geocoding service.
     */
    public double[] parseLocation(String location) {
        // Default to Istanbul coordinates if parsing fails
        if (location == null || location.isEmpty()) {
            return new double[]{41.0082, 28.9784};
        }

        // Simple hash-based coordinates for demo
        int hash = location.hashCode();
        double lat = 41.0 + (hash % 1000) / 1000.0;
        double lon = 28.0 + (hash % 1000) / 1000.0;

        return new double[]{lat, lon};
    }
}
