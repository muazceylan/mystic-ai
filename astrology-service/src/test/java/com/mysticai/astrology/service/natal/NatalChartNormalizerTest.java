package com.mysticai.astrology.service.natal;

import com.mysticai.astrology.dto.natal.NormalizedNatalChart;
import com.mysticai.astrology.service.NatalChartCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class NatalChartNormalizerTest {

    private NatalChartNormalizer normalizer;

    @BeforeEach
    void setUp() {
        normalizer = new NatalChartNormalizer(new NatalChartCalculator(null));
    }

    private NormalizedNatalChart normalizeRichChart() {
        return normalizer.normalize(
                42L, "tr", true, "Leo", 16.0,
                NatalChartTestFixtures.richChartPlanets(),
                NatalChartTestFixtures.leoRisingHouses(),
                NatalChartTestFixtures.richAspects());
    }

    @Test
    @DisplayName("carries every calculated placement through unchanged")
    void preservesPlacements() {
        NormalizedNatalChart chart = normalizeRichChart();

        assertEquals("Pisces", chart.sun().sign());
        assertEquals(8, chart.sun().house());
        assertEquals(16.2, chart.sun().degree(), 0.001);
        assertEquals("Virgo", chart.moon().sign());
        assertEquals(1, chart.moon().house());
        assertEquals(12, chart.planets().size());
    }

    @Test
    @DisplayName("resolves the chart ruler to where that planet actually sits")
    void resolvesChartRulerPlacement() {
        NormalizedNatalChart chart = normalizeRichChart();

        // Leo rising -> Sun rules the chart, and the Sun is in Pisces in the 8th.
        assertEquals("Sun", chart.chartRuler().planet());
        assertEquals("Pisces", chart.chartRuler().sign());
        assertEquals(8, chart.chartRuler().house());
    }

    @Test
    @DisplayName("links each house cusp to its ruler's own placement")
    void linksHouseRulersToTheirPlacement() {
        NormalizedNatalChart chart = normalizeRichChart();

        NormalizedNatalChart.NormalizedHouse seventh = chart.houses().stream()
                .filter(h -> h.houseNumber() == 7).findFirst().orElseThrow();

        // 7th cusp is Aquarius, ruled by Uranus, which sits in Capricorn in the 6th.
        assertEquals("Aquarius", seventh.sign());
        assertEquals("Uranus", seventh.ruler());
        assertEquals("Capricorn", seventh.rulerSign());
        assertEquals(6, seventh.rulerHouse());
    }

    @Test
    @DisplayName("lists the planets physically sitting in each house")
    void listsResidentPlanets() {
        NormalizedNatalChart chart = normalizeRichChart();

        NormalizedNatalChart.NormalizedHouse eighth = chart.houses().stream()
                .filter(h -> h.houseNumber() == 8).findFirst().orElseThrow();

        assertTrue(eighth.residentPlanets().containsAll(List.of("Sun", "Saturn")));
    }

    @Test
    @DisplayName("classifies aspect strength by orb and tone by type")
    void classifiesAspects() {
        NormalizedNatalChart chart = normalizeRichChart();

        NormalizedNatalChart.NormalizedAspect sunNode = chart.aspects().stream()
                .filter(a -> a.planet1().equals("Sun") && a.planet2().equals("NorthNode"))
                .findFirst().orElseThrow();
        assertEquals("TIGHT", sunNode.strength());
        assertEquals("TENSE", sunNode.tone());

        NormalizedNatalChart.NormalizedAspect moonVenus = chart.aspects().stream()
                .filter(a -> a.planet1().equals("Moon") && a.planet2().equals("Venus"))
                .findFirst().orElseThrow();
        assertEquals("SUPPORTIVE", moonVenus.tone());

        NormalizedNatalChart.NormalizedAspect sunSaturn = chart.aspects().stream()
                .filter(a -> a.planet2().equals("Saturn")).findFirst().orElseThrow();
        assertEquals("FUSED", sunSaturn.tone());
    }

    @Test
    @DisplayName("sorts aspects tightest first so the interpreter leads with the loudest one")
    void sortsAspectsByOrb() {
        NormalizedNatalChart chart = normalizeRichChart();

        double previous = -1;
        for (NormalizedNatalChart.NormalizedAspect aspect : chart.aspects()) {
            assertTrue(aspect.orb() >= previous, "aspects must be ordered by ascending orb");
            previous = aspect.orb();
        }
        assertEquals(0.13, chart.aspects().get(0).orb(), 0.001);
    }

    @Test
    @DisplayName("flags anaretic and angular placements")
    void flagsAnareticAndAngular() {
        NormalizedNatalChart chart = normalizeRichChart();

        NormalizedNatalChart.NormalizedPlanet mars = findPlanet(chart, "Mars");
        assertTrue(mars.anaretic(), "Mars at 29.6 degrees is anaretic");
        assertFalse(mars.angular(), "the 6th house is not angular");

        NormalizedNatalChart.NormalizedPlanet moon = findPlanet(chart, "Moon");
        assertTrue(moon.angular(), "the 1st house is angular");
    }

    @Test
    @DisplayName("weights dominant planets by angularity and aspect count")
    void computesEmphasis() {
        NormalizedNatalChart chart = normalizeRichChart();
        NormalizedNatalChart.ChartEmphasis emphasis = chart.emphasis();

        assertNotNull(emphasis.dominantElement());
        assertNotNull(emphasis.dominantModality());
        assertFalse(emphasis.dominantPlanets().isEmpty());
        assertTrue(emphasis.dominantPlanets().contains("Moon"),
                "an angular, heavily aspected Moon should rank as dominant");
        assertTrue(emphasis.stelliumHouses().contains(6),
                "Mars, Uranus and Neptune all sit in the 6th");
        assertTrue(emphasis.tenseAspectCount() > 0);
        assertTrue(emphasis.supportiveAspectCount() > 0);
    }

    @Test
    @DisplayName("drops houses, ascendant and chart ruler when the birth time is unknown")
    void withoutBirthTimeHousesAreNotTrustworthy() {
        NormalizedNatalChart chart = normalizer.normalize(
                7L, "tr", false, null, null,
                NatalChartTestFixtures.richChartPlanets(),
                NatalChartTestFixtures.leoRisingHouses(),
                NatalChartTestFixtures.richAspects());

        assertFalse(chart.birthTimeKnown());
        assertNull(chart.ascendant());
        assertNull(chart.chartRuler());
        assertTrue(chart.houses().isEmpty());
        assertTrue(chart.planets().stream().allMatch(p -> p.house() == null),
                "no placement may claim a house when the birth time is unknown");
        assertFalse(chart.planets().stream().anyMatch(NormalizedNatalChart.NormalizedPlanet::angular));
    }

    @Test
    @DisplayName("handles a chart with almost no aspects without failing")
    void handlesSparseChart() {
        NormalizedNatalChart chart = normalizer.normalize(
                9L, "en", true, "Leo", 16.0,
                NatalChartTestFixtures.richChartPlanets(),
                NatalChartTestFixtures.leoRisingHouses(),
                NatalChartTestFixtures.sparseAspects());

        assertEquals(2, chart.aspects().size());
        assertNotNull(chart.emphasis());
        assertFalse(chart.emphasis().dominantPlanets().isEmpty());
    }

    @Test
    @DisplayName("survives an empty chart rather than throwing")
    void handlesEmptyChart() {
        NormalizedNatalChart chart = normalizer.normalize(
                1L, "tr", false, null, null, List.of(), List.of(), List.of());

        assertNull(chart.sun());
        assertNull(chart.moon());
        assertTrue(chart.planets().isEmpty());
        assertNotNull(chart.emphasis());
    }

    private NormalizedNatalChart.NormalizedPlanet findPlanet(NormalizedNatalChart chart, String name) {
        return chart.planets().stream()
                .filter(p -> p.planet().equals(name))
                .findFirst().orElseThrow();
    }
}
