package com.mysticai.astrology.dto.natal;

import java.util.List;
import java.util.Map;

/**
 * Factual, calculation-derived view of a natal chart handed to the AI interpreter.
 *
 * <p>This record is the ONLY chart information an LLM ever sees. Everything in it is produced by
 * the deterministic Swiss Ephemeris pipeline ({@code NatalChartCalculator}); the model is never
 * asked — and never allowed — to compute or infer a placement itself. The validator
 * ({@code NatalPortraitValidator}) later checks every claim the model makes back against this
 * same object, so it doubles as the source of truth for hallucination rejection.</p>
 */
public record NormalizedNatalChart(
        Long chartId,
        String locale,
        /** False when birth time was unknown: rising sign, houses and angles are not trustworthy. */
        boolean birthTimeKnown,
        NormalizedPlanet sun,
        NormalizedPlanet moon,
        NormalizedAscendant ascendant,
        /** Ruling planet of the Ascendant sign, plus where that ruler actually sits. */
        ChartRuler chartRuler,
        List<NormalizedPlanet> planets,
        List<NormalizedHouse> houses,
        List<NormalizedAspect> aspects,
        /** Planet count per element: Fire, Earth, Air, Water. */
        Map<String, Integer> elements,
        /** Planet count per modality: Cardinal, Fixed, Mutable. */
        Map<String, Integer> modalities,
        ChartEmphasis emphasis
) {

    /** A single placement: planet + sign + house + exact degree. */
    public record NormalizedPlanet(
            String planet,
            String sign,
            /** Degree within the sign, 0-30, rounded to 2 decimals. */
            double degree,
            /** Ecliptic longitude 0-360, rounded to 2 decimals. */
            double absoluteLongitude,
            /** Null when houses are not trustworthy (unknown birth time). */
            Integer house,
            boolean retrograde,
            /** True at 29° — the anaretic (crisis/mastery) degree. */
            boolean anaretic,
            /** True in houses 1, 4, 7, 10 — the loudest, most visible placements. */
            boolean angular
    ) {}

    public record NormalizedAscendant(
            String sign,
            double degree
    ) {}

    public record ChartRuler(
            String planet,
            String sign,
            Integer house
    ) {}

    public record NormalizedHouse(
            int houseNumber,
            String sign,
            double degree,
            /** Sign ruler of the cusp. */
            String ruler,
            /** Where that ruler is placed — the "dispositor" link that carries the house's story. */
            String rulerSign,
            Integer rulerHouse,
            /** Planets physically sitting in this house. */
            List<String> residentPlanets
    ) {}

    public record NormalizedAspect(
            String planet1,
            String planet2,
            String type,
            double angle,
            double orb,
            /** TIGHT (orb <= 2), CLOSE (<= 5), WIDE — how loudly this aspect actually speaks. */
            String strength,
            /** SUPPORTIVE for trine/sextile, TENSE for square/opposition/quincunx, FUSED for conjunction. */
            String tone
    ) {}

    /**
     * Derived weightings that let the interpreter prioritise instead of listing everything equally.
     */
    public record ChartEmphasis(
            String dominantElement,
            String dominantModality,
            /** Planets scored highest by angularity, aspect count and dignity-free weighting. */
            List<String> dominantPlanets,
            /** Houses holding two or more planets. */
            List<Integer> stelliumHouses,
            /** Signs holding two or more planets. */
            List<String> stelliumSigns,
            int tenseAspectCount,
            int supportiveAspectCount,
            /** Elements with a zero count — often the loudest thing about a chart. */
            List<String> missingElements
    ) {}
}
