package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.PlanetPosition;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Builds the real-sky context that grounds an AI-written sun-sign horoscope.
 *
 * Sun-sign horoscopes are written for a whole sign rather than a birth chart, so the
 * grounding is the relationship between today's transiting planets and the sign itself
 * (0° of that sign stands in for the reader). Everything here is deterministic Swiss
 * Ephemeris output — the model is asked to interpret it, never to invent it.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HoroscopeSkyContextService {

    private final TransitCalculator transitCalculator;

    private static final List<String> SIGN_ORDER = List.of(
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    );

    /** Planets that carry enough weight for a sign-level reading, in reporting order. */
    private static final List<String> REPORTED_PLANETS = List.of(
            "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"
    );

    /** Sign-distance (0-11) to the aspect it produces between whole signs. */
    private static final String[] ASPECT_BY_SIGN_DISTANCE = {
            "conjunct (same sign)", "semisextile", "sextile (supportive)", "square (tension)",
            "trine (flowing)", "quincunx (adjustment)", "opposition (polarity)", "quincunx (adjustment)",
            "trine (flowing)", "square (tension)", "sextile (supportive)", "semisextile"
    };

    private static final Map<String, String[]> SIGN_TRAITS = buildSignTraits();

    /**
     * @param sign   lowercase english sign key, e.g. "leo"
     * @param period "daily" or "weekly"
     * @param date   the day the reading is for (week start for weekly)
     * @return a compact plain-text sky briefing, or null if the ephemeris is unavailable
     */
    public String build(String sign, String period, LocalDate date) {
        String canonicalSign = toCanonicalSign(sign);
        if (canonicalSign == null || date == null) {
            return null;
        }
        boolean weekly = "weekly".equalsIgnoreCase(period);

        try {
            StringBuilder sb = new StringBuilder();
            String[] traits = SIGN_TRAITS.get(canonicalSign);
            sb.append("Sign: ").append(canonicalSign)
                    .append(" (element ").append(traits[0])
                    .append(", modality ").append(traits[1])
                    .append(", ruler ").append(traits[2]).append(")\n");

            if (weekly) {
                LocalDate weekEnd = date.plusDays(6);
                sb.append("Period: week of ").append(date).append(" to ").append(weekEnd).append("\n");
                sb.append("Moon phase at week start: ").append(transitCalculator.getMoonPhase(date)).append("\n");
                sb.append("Moon phase at week end: ").append(transitCalculator.getMoonPhase(weekEnd)).append("\n\n");

                List<PlanetPosition> start = transitCalculator.calculateTransitPositions(date);
                List<PlanetPosition> end = transitCalculator.calculateTransitPositions(weekEnd);
                sb.append("Sky at week start:\n").append(describePositions(start, canonicalSign));
                sb.append("\nSky at week end:\n").append(describePositions(end, canonicalSign));

                String ingresses = describeIngresses(start, end);
                if (!ingresses.isEmpty()) {
                    sb.append("\nSign changes during the week:\n").append(ingresses);
                }
            } else {
                sb.append("Period: ").append(date).append(" (single day)\n");
                sb.append("Moon phase: ").append(transitCalculator.getMoonPhase(date)).append("\n\n");
                sb.append("Sky today:\n").append(describePositions(
                        transitCalculator.calculateTransitPositions(date), canonicalSign));
            }

            return sb.toString();
        } catch (Exception e) {
            log.warn("Sky context build failed for {} {} {}: {}", sign, period, date, e.getMessage());
            return null;
        }
    }

    private String describePositions(List<PlanetPosition> positions, String canonicalSign) {
        if (positions == null || positions.isEmpty()) return "";
        Map<String, PlanetPosition> byName = new LinkedHashMap<>();
        for (PlanetPosition position : positions) {
            if (position != null && position.planet() != null) {
                byName.put(position.planet(), position);
            }
        }

        StringBuilder sb = new StringBuilder();
        List<String> retrogrades = new ArrayList<>();
        for (String planet : REPORTED_PLANETS) {
            PlanetPosition position = byName.get(planet);
            if (position == null) continue;

            sb.append("- ").append(planet)
                    .append(" in ").append(position.sign())
                    .append(' ').append((int) position.degree()).append('°');
            if (position.retrograde()) {
                sb.append(" retrograde");
                retrogrades.add(planet);
            }
            sb.append(" — ").append(aspectToSign(position.sign(), canonicalSign)).append('\n');
        }
        if (!retrogrades.isEmpty()) {
            sb.append("Retrograde now: ").append(String.join(", ", retrogrades)).append('\n');
        }
        return sb.toString();
    }

    private String describeIngresses(List<PlanetPosition> start, List<PlanetPosition> end) {
        Map<String, String> startSigns = new LinkedHashMap<>();
        for (PlanetPosition position : start) {
            if (position != null) startSigns.put(position.planet(), position.sign());
        }

        StringBuilder sb = new StringBuilder();
        for (PlanetPosition position : end) {
            if (position == null || !REPORTED_PLANETS.contains(position.planet())) continue;
            String from = startSigns.get(position.planet());
            if (from != null && !from.equals(position.sign())) {
                sb.append("- ").append(position.planet())
                        .append(" moves from ").append(from)
                        .append(" into ").append(position.sign()).append('\n');
            }
        }
        return sb.toString();
    }

    /** Whole-sign aspect between a transiting planet's sign and the reader's sign. */
    private String aspectToSign(String planetSign, String canonicalSign) {
        int planetIndex = SIGN_ORDER.indexOf(planetSign);
        int signIndex = SIGN_ORDER.indexOf(canonicalSign);
        if (planetIndex < 0 || signIndex < 0) {
            return "no clear angle to " + canonicalSign;
        }
        int distance = Math.floorMod(planetIndex - signIndex, 12);
        return ASPECT_BY_SIGN_DISTANCE[distance] + " to " + canonicalSign;
    }

    private String toCanonicalSign(String sign) {
        if (sign == null || sign.isBlank()) return null;
        String normalized = sign.trim().toLowerCase(Locale.ROOT);
        for (String candidate : SIGN_ORDER) {
            if (candidate.toLowerCase(Locale.ROOT).equals(normalized)) {
                return candidate;
            }
        }
        return null;
    }

    private static Map<String, String[]> buildSignTraits() {
        Map<String, String[]> traits = new LinkedHashMap<>();
        traits.put("Aries", new String[]{"Fire", "Cardinal", "Mars"});
        traits.put("Taurus", new String[]{"Earth", "Fixed", "Venus"});
        traits.put("Gemini", new String[]{"Air", "Mutable", "Mercury"});
        traits.put("Cancer", new String[]{"Water", "Cardinal", "Moon"});
        traits.put("Leo", new String[]{"Fire", "Fixed", "Sun"});
        traits.put("Virgo", new String[]{"Earth", "Mutable", "Mercury"});
        traits.put("Libra", new String[]{"Air", "Cardinal", "Venus"});
        traits.put("Scorpio", new String[]{"Water", "Fixed", "Mars/Pluto"});
        traits.put("Sagittarius", new String[]{"Fire", "Mutable", "Jupiter"});
        traits.put("Capricorn", new String[]{"Earth", "Cardinal", "Saturn"});
        traits.put("Aquarius", new String[]{"Air", "Fixed", "Saturn/Uranus"});
        traits.put("Pisces", new String[]{"Water", "Mutable", "Jupiter/Neptune"});
        return traits;
    }
}
