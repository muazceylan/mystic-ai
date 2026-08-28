package com.mysticai.astrology.service.natal;

import com.mysticai.astrology.dto.HousePlacement;
import com.mysticai.astrology.dto.PlanetPosition;
import com.mysticai.astrology.dto.PlanetaryAspect;

import java.util.ArrayList;
import java.util.List;

/**
 * Shared chart shapes for the natal interpretation tests.
 *
 * <p>Kept as plain builders rather than JSON fixtures so a test can say exactly which placement it
 * is asserting on, and so a change to the calculated DTOs fails compilation instead of silently
 * producing a chart nobody notices is wrong.</p>
 */
final class NatalChartTestFixtures {

    private NatalChartTestFixtures() {}

    /** The worked example from the redesign brief: Pisces Sun in the 8th, Virgo Moon in the 1st, Leo rising. */
    static List<PlanetPosition> richChartPlanets() {
        List<PlanetPosition> planets = new ArrayList<>();
        planets.add(planet("Sun", "Pisces", 16.2, 8, 346.2, false));
        planets.add(planet("Moon", "Virgo", 4.5, 1, 154.5, false));
        planets.add(planet("Mercury", "Aquarius", 22.1, 7, 322.1, true));
        planets.add(planet("Venus", "Aries", 3.4, 9, 3.4, false));
        planets.add(planet("Mars", "Capricorn", 29.6, 6, 299.6, false));
        planets.add(planet("Jupiter", "Leo", 11.0, 1, 131.0, false));
        planets.add(planet("Saturn", "Pisces", 25.8, 8, 355.8, false));
        planets.add(planet("Uranus", "Capricorn", 14.2, 6, 284.2, false));
        planets.add(planet("Neptune", "Capricorn", 18.9, 6, 288.9, false));
        planets.add(planet("Pluto", "Scorpio", 21.3, 4, 231.3, true));
        planets.add(planet("Chiron", "Cancer", 7.7, 12, 97.7, false));
        planets.add(planet("NorthNode", "Sagittarius", 2.9, 5, 242.9, false));
        return planets;
    }

    /** Same chart with only two aspects, to exercise the sparse-chart path. */
    static List<PlanetaryAspect> sparseAspects() {
        return List.of(
                new PlanetaryAspect("Sun", "Saturn", PlanetaryAspect.AspectType.CONJUNCTION, 9.6, 1.42),
                new PlanetaryAspect("Moon", "Venus", PlanetaryAspect.AspectType.TRINE, 118.9, 1.1)
        );
    }

    static List<PlanetaryAspect> richAspects() {
        return List.of(
                new PlanetaryAspect("Sun", "NorthNode", PlanetaryAspect.AspectType.SQUARE, 89.87, 0.13),
                new PlanetaryAspect("Sun", "Saturn", PlanetaryAspect.AspectType.CONJUNCTION, 9.6, 1.42),
                new PlanetaryAspect("Moon", "Venus", PlanetaryAspect.AspectType.TRINE, 118.9, 1.1),
                new PlanetaryAspect("Moon", "Mercury", PlanetaryAspect.AspectType.OPPOSITION, 177.6, 2.4),
                new PlanetaryAspect("Mars", "Pluto", PlanetaryAspect.AspectType.SEXTILE, 62.3, 2.3),
                new PlanetaryAspect("Venus", "Jupiter", PlanetaryAspect.AspectType.QUINCUNX, 152.4, 2.4),
                new PlanetaryAspect("Mercury", "Neptune", PlanetaryAspect.AspectType.SQUARE, 93.2, 3.2)
        );
    }

    /** Whole-sign-ish cusps starting from Leo, matching a Leo Ascendant. */
    static List<HousePlacement> leoRisingHouses() {
        String[] signs = {
                "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn",
                "Aquarius", "Pisces", "Aries", "Taurus", "Gemini", "Cancer"
        };
        String[] rulers = {
                "Sun", "Mercury", "Venus", "Pluto", "Jupiter", "Saturn",
                "Uranus", "Neptune", "Mars", "Venus", "Mercury", "Moon"
        };
        List<HousePlacement> houses = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            houses.add(new HousePlacement(i + 1, signs[i], 16.0, rulers[i]));
        }
        return houses;
    }

    /**
     * Unequal house cusps that leave signs intercepted.
     *
     * <p>With wide houses at the top of the chart, some signs never reach a cusp at all — Aquarius
     * and Leo here sit entirely inside a house rather than ruling one. That matters because the
     * cusp ruler is what the interpreter follows to carry a house's story elsewhere, and an
     * intercepted sign has no cusp to be looked up from.</p>
     */
    static List<HousePlacement> interceptedHouses() {
        // 1st Capricorn 5°, then two very wide houses that swallow Aquarius and Leo whole.
        String[] signs = {
                "Capricorn", "Pisces", "Aries", "Taurus", "Gemini", "Cancer",
                "Cancer", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn"
        };
        String[] rulers = {
                "Saturn", "Neptune", "Mars", "Venus", "Mercury", "Moon",
                "Moon", "Mercury", "Venus", "Pluto", "Jupiter", "Saturn"
        };
        double[] degrees = { 5.0, 2.0, 8.0, 14.0, 20.0, 26.0, 5.0, 2.0, 8.0, 14.0, 20.0, 26.0 };

        List<HousePlacement> houses = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            houses.add(new HousePlacement(i + 1, signs[i], degrees[i], rulers[i]));
        }
        return houses;
    }

    /** A chart whose planets include the intercepted signs no cusp points at. */
    static List<PlanetPosition> interceptedChartPlanets() {
        List<PlanetPosition> planets = new ArrayList<>();
        planets.add(planet("Sun", "Aquarius", 12.0, 1, 312.0, false));
        planets.add(planet("Moon", "Leo", 18.0, 7, 138.0, false));
        planets.add(planet("Mercury", "Aquarius", 3.0, 1, 303.0, true));
        planets.add(planet("Venus", "Capricorn", 27.0, 12, 297.0, false));
        planets.add(planet("Mars", "Leo", 25.0, 7, 145.0, false));
        planets.add(planet("Jupiter", "Taurus", 9.0, 4, 39.0, false));
        planets.add(planet("Saturn", "Aries", 16.0, 3, 16.0, false));
        planets.add(planet("Uranus", "Sagittarius", 11.0, 11, 251.0, false));
        planets.add(planet("Neptune", "Capricorn", 19.0, 12, 289.0, false));
        planets.add(planet("Pluto", "Scorpio", 4.0, 10, 214.0, true));
        return planets;
    }

    private static PlanetPosition planet(
            String name, String sign, double degree, int house, double absolute, boolean retrograde) {
        int minutes = (int) ((degree - Math.floor(degree)) * 60);
        return new PlanetPosition(name, sign, degree, minutes, 0, retrograde, house, absolute);
    }
}
