package com.mysticai.astrology.service.natal;

import com.mysticai.astrology.dto.HousePlacement;
import com.mysticai.astrology.dto.PlanetPosition;
import com.mysticai.astrology.dto.PlanetaryAspect;
import com.mysticai.astrology.dto.natal.NormalizedNatalChart;
import com.mysticai.astrology.service.NatalChartCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Turns the deterministic chart output into the factual context an interpreter can reason over.
 *
 * <p>Two things happen here and nowhere else. First, raw placements are flattened into a shape
 * that is cheap to validate against — every planet carries its sign, house and degree explicitly.
 * Second, the chart is <em>weighted</em>: dominant planets, stelliums, angularity and aspect tone
 * are computed up front so the interpreter can lead with what actually matters in this chart
 * instead of walking a fixed checklist. That weighting is the difference between a synthesis and
 * a list of definitions.</p>
 *
 * <p>No interpretation, wording or judgement lives here — only arithmetic over calculated data.</p>
 */
@Service
@RequiredArgsConstructor
public class NatalChartNormalizer {

    private final NatalChartCalculator natalChartCalculator;

    /** The ten bodies used for element/modality weighting, matching the calculator's own set. */
    private static final Set<String> CORE_PLANETS = Set.of(
            "Sun", "Moon", "Mercury", "Venus", "Mars",
            "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"
    );

    private static final Set<Integer> ANGULAR_HOUSES = Set.of(1, 4, 7, 10);

    /** Personal planets speak loudest about lived personality, so they carry more weight. */
    private static final Map<String, Integer> PLANET_BASE_WEIGHT = Map.of(
            "Sun", 5, "Moon", 5, "Mercury", 3, "Venus", 3, "Mars", 3,
            "Jupiter", 2, "Saturn", 3, "Uranus", 1, "Neptune", 1, "Pluto", 1
    );

    public NormalizedNatalChart normalize(
            Long chartId,
            String locale,
            boolean birthTimeKnown,
            String risingSign,
            Double ascendantDegree,
            List<PlanetPosition> planets,
            List<HousePlacement> houses,
            List<PlanetaryAspect> aspects
    ) {
        List<PlanetPosition> safePlanets = planets != null ? planets : List.of();
        List<HousePlacement> safeHouses = houses != null ? houses : List.of();
        List<PlanetaryAspect> safeAspects = aspects != null ? aspects : List.of();

        List<NormalizedNatalChart.NormalizedPlanet> normalizedPlanets = safePlanets.stream()
                .map(p -> toNormalizedPlanet(p, birthTimeKnown))
                .toList();

        List<NormalizedNatalChart.NormalizedAspect> normalizedAspects = safeAspects.stream()
                .map(this::toNormalizedAspect)
                .sorted(Comparator.comparingDouble(NormalizedNatalChart.NormalizedAspect::orb))
                .toList();

        List<NormalizedNatalChart.NormalizedHouse> normalizedHouses = birthTimeKnown
                ? buildHouses(safeHouses, safePlanets)
                : List.of();

        Map<String, Integer> elements = natalChartCalculator.computeElementDistribution(safePlanets);
        Map<String, Integer> modalities = natalChartCalculator.computeModeDistribution(safePlanets);

        return new NormalizedNatalChart(
                chartId,
                locale,
                birthTimeKnown,
                findPlanet(normalizedPlanets, "Sun"),
                findPlanet(normalizedPlanets, "Moon"),
                buildAscendant(risingSign, ascendantDegree, birthTimeKnown),
                buildChartRuler(risingSign, normalizedPlanets, birthTimeKnown),
                normalizedPlanets,
                normalizedHouses,
                normalizedAspects,
                elements,
                modalities,
                buildEmphasis(normalizedPlanets, normalizedAspects, elements, modalities)
        );
    }

    private NormalizedNatalChart.NormalizedPlanet toNormalizedPlanet(PlanetPosition p, boolean birthTimeKnown) {
        Integer house = birthTimeKnown && p.house() > 0 ? p.house() : null;
        return new NormalizedNatalChart.NormalizedPlanet(
                p.planet(),
                p.sign(),
                round2(p.degree()),
                round2(p.absoluteLongitude()),
                house,
                p.retrograde(),
                p.degree() >= 29.0,
                house != null && ANGULAR_HOUSES.contains(house)
        );
    }

    private NormalizedNatalChart.NormalizedAspect toNormalizedAspect(PlanetaryAspect a) {
        String type = a.type() != null ? a.type().name() : "CONJUNCTION";
        return new NormalizedNatalChart.NormalizedAspect(
                a.planet1(),
                a.planet2(),
                type,
                round2(a.angle()),
                round2(a.orb()),
                orbStrength(a.orb()),
                aspectTone(type)
        );
    }

    private List<NormalizedNatalChart.NormalizedHouse> buildHouses(
            List<HousePlacement> houses, List<PlanetPosition> planets) {

        Map<String, PlanetPosition> byPlanet = new LinkedHashMap<>();
        for (PlanetPosition p : planets) {
            byPlanet.put(p.planet(), p);
        }

        List<NormalizedNatalChart.NormalizedHouse> result = new ArrayList<>();
        for (HousePlacement house : houses) {
            List<String> residents = planets.stream()
                    .filter(p -> p.house() == house.houseNumber())
                    .map(PlanetPosition::planet)
                    .toList();

            // The cusp ruler's own placement is what carries a house's story into lived experience,
            // so it travels alongside the cusp rather than being looked up again downstream.
            PlanetPosition rulerPlacement = house.ruler() != null ? byPlanet.get(house.ruler()) : null;

            result.add(new NormalizedNatalChart.NormalizedHouse(
                    house.houseNumber(),
                    house.sign(),
                    round2(house.degree()),
                    house.ruler(),
                    rulerPlacement != null ? rulerPlacement.sign() : null,
                    rulerPlacement != null && rulerPlacement.house() > 0 ? rulerPlacement.house() : null,
                    residents
            ));
        }
        return result;
    }

    private NormalizedNatalChart.NormalizedAscendant buildAscendant(
            String risingSign, Double ascendantDegree, boolean birthTimeKnown) {
        if (!birthTimeKnown || risingSign == null) return null;
        return new NormalizedNatalChart.NormalizedAscendant(
                risingSign,
                round2(ascendantDegree != null ? ascendantDegree : 0.0)
        );
    }

    private NormalizedNatalChart.ChartRuler buildChartRuler(
            String risingSign,
            List<NormalizedNatalChart.NormalizedPlanet> planets,
            boolean birthTimeKnown) {
        if (!birthTimeKnown) return null;
        String ruler = natalChartCalculator.computeChartRuler(risingSign);
        if (ruler == null) return null;
        NormalizedNatalChart.NormalizedPlanet placement = findPlanet(planets, ruler);
        return new NormalizedNatalChart.ChartRuler(
                ruler,
                placement != null ? placement.sign() : null,
                placement != null ? placement.house() : null
        );
    }

    private NormalizedNatalChart.ChartEmphasis buildEmphasis(
            List<NormalizedNatalChart.NormalizedPlanet> planets,
            List<NormalizedNatalChart.NormalizedAspect> aspects,
            Map<String, Integer> elements,
            Map<String, Integer> modalities) {

        Map<String, Integer> aspectCount = new LinkedHashMap<>();
        for (NormalizedNatalChart.NormalizedAspect a : aspects) {
            aspectCount.merge(a.planet1(), 1, Integer::sum);
            aspectCount.merge(a.planet2(), 1, Integer::sum);
        }

        // A planet is "dominant" when it is personal, angular, or heavily aspected — the three
        // things that actually make a placement show up in someone's day.
        List<String> dominant = planets.stream()
                .filter(p -> CORE_PLANETS.contains(p.planet()))
                .sorted(Comparator.comparingInt((NormalizedNatalChart.NormalizedPlanet p) ->
                        PLANET_BASE_WEIGHT.getOrDefault(p.planet(), 1)
                                + (p.angular() ? 4 : 0)
                                + aspectCount.getOrDefault(p.planet(), 0)
                                + (p.anaretic() ? 1 : 0)).reversed())
                .limit(4)
                .map(NormalizedNatalChart.NormalizedPlanet::planet)
                .toList();

        Map<Integer, Integer> houseCount = new LinkedHashMap<>();
        Map<String, Integer> signCount = new LinkedHashMap<>();
        for (NormalizedNatalChart.NormalizedPlanet p : planets) {
            if (!CORE_PLANETS.contains(p.planet())) continue;
            if (p.house() != null) houseCount.merge(p.house(), 1, Integer::sum);
            if (p.sign() != null) signCount.merge(p.sign(), 1, Integer::sum);
        }

        int tense = (int) aspects.stream().filter(a -> "TENSE".equals(a.tone())).count();
        int supportive = (int) aspects.stream().filter(a -> "SUPPORTIVE".equals(a.tone())).count();

        List<String> missingElements = elements.entrySet().stream()
                .filter(e -> e.getValue() == null || e.getValue() == 0)
                .map(Map.Entry::getKey)
                .toList();

        return new NormalizedNatalChart.ChartEmphasis(
                topKey(elements),
                topKey(modalities),
                dominant,
                houseCount.entrySet().stream().filter(e -> e.getValue() >= 2).map(Map.Entry::getKey).sorted().toList(),
                signCount.entrySet().stream().filter(e -> e.getValue() >= 2).map(Map.Entry::getKey).sorted().toList(),
                tense,
                supportive,
                missingElements
        );
    }

    private NormalizedNatalChart.NormalizedPlanet findPlanet(
            List<NormalizedNatalChart.NormalizedPlanet> planets, String name) {
        if (name == null) return null;
        return planets.stream()
                .filter(p -> name.equalsIgnoreCase(p.planet()))
                .findFirst()
                .orElse(null);
    }

    private String topKey(Map<String, Integer> counts) {
        if (counts == null || counts.isEmpty()) return null;
        return counts.entrySet().stream()
                .max(Comparator.comparingInt(e -> e.getValue() == null ? 0 : e.getValue()))
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private String orbStrength(double orb) {
        double abs = Math.abs(orb);
        if (abs <= 2.0) return "TIGHT";
        if (abs <= 5.0) return "CLOSE";
        return "WIDE";
    }

    private String aspectTone(String type) {
        return switch (type) {
            case "TRINE", "SEXTILE" -> "SUPPORTIVE";
            case "SQUARE", "OPPOSITION", "QUINCUNX" -> "TENSE";
            default -> "FUSED";
        };
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
