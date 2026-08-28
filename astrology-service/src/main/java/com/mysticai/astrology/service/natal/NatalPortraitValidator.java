package com.mysticai.astrology.service.natal;

import com.mysticai.astrology.dto.natal.NatalPortrait;
import com.mysticai.astrology.dto.natal.NormalizedNatalChart;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Guards the boundary between "the model wrote something" and "a user reads it".
 *
 * <p>The interpreter is allowed to say what a placement <em>means</em>; it is never allowed to say
 * a placement <em>exists</em>. Every {@link NatalPortrait.Evidence} chip carries typed fields, and
 * each one is checked back against the calculated chart. A sign that does not match, a house the
 * planet is not in, an aspect that was never computed — any of these is fatal, because a wrong
 * receipt is worse than no receipt: it teaches the user something false about their own chart.</p>
 *
 * <p>Structural problems (missing sections, empty summaries, the model repeating one paragraph
 * across six cards) are fatal too. Everything softer — an over-long string, a stray duplicate trait
 * — is reported as a warning and repaired by {@link NatalPortraitSanitizer} instead.</p>
 */
@Service
public class NatalPortraitValidator {

    /** Beyond this a card stops being scannable and starts being a wall of text. */
    private static final int MAX_SUMMARY_CHARS = 1200;
    private static final int MAX_LINE_CHARS = 400;
    /** Degrees of slack when comparing a quoted orb to the calculated one. */
    private static final double ORB_TOLERANCE = 0.35;

    /** Cards the UI renders unconditionally; without them the screen has holes. */
    private static final Set<String> REQUIRED_ABOUT_ME = Set.of(
            "core_character", "emotional_world", "social_image", "strengths", "challenges");
    private static final Set<String> REQUIRED_LIFE_AREAS = Set.of(
            "love", "career", "life_direction");

    public record Result(List<String> fatal, List<String> warnings) {
        public boolean valid() {
            return fatal.isEmpty();
        }

        public String correctionSummary() {
            return String.join("; ", fatal);
        }
    }

    public Result validate(NatalPortrait portrait, NormalizedNatalChart chart) {
        List<String> fatal = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        if (portrait == null) {
            fatal.add("portrait is null");
            return new Result(fatal, warnings);
        }

        validateStructure(portrait, fatal, warnings);
        validateEvidence(portrait, chart, fatal);
        validateNoTemplateRepetition(portrait, fatal, warnings);

        return new Result(fatal, warnings);
    }

    // ---------------------------------------------------------------- structure

    private void validateStructure(NatalPortrait p, List<String> fatal, List<String> warnings) {
        if (p.portrait() == null || isBlank(p.portrait().headline()) || isBlank(p.portrait().summary())) {
            fatal.add("portrait.headline/summary missing");
        } else if (p.portrait().traits() == null || p.portrait().traits().size() < 3) {
            fatal.add("portrait.traits must contain at least 3 chart-derived traits");
        }

        if (p.bigThree() == null || p.bigThree().sun() == null || p.bigThree().moon() == null) {
            fatal.add("bigThree.sun and bigThree.moon are required");
        } else {
            checkBigThree(p.bigThree().sun(), "sun", fatal);
            checkBigThree(p.bigThree().moon(), "moon", fatal);
            if (p.bigThree().ascendant() != null) {
                checkBigThree(p.bigThree().ascendant(), "ascendant", fatal);
            }
        }

        Set<String> aboutMeIds = idsOf(p.aboutMe());
        for (String required : REQUIRED_ABOUT_ME) {
            if (!aboutMeIds.contains(required)) fatal.add("aboutMe missing topic: " + required);
        }

        Set<String> lifeIds = idsOf(p.lifeAreas());
        for (String required : REQUIRED_LIFE_AREAS) {
            if (!lifeIds.contains(required)) fatal.add("lifeAreas missing topic: " + required);
        }

        if (p.planetReadings() != null) {
            for (NatalPortrait.PlacementReading reading : p.planetReadings()) {
                if (reading == null) continue;
                if (isBlank(reading.howItShowsUpInYou())) {
                    fatal.add("planet reading " + reading.planet() + " has no synthesis");
                }
                if (isBlank(reading.title())) {
                    fatal.add("planet reading " + reading.planet() + " has no title");
                }
            }
        }

        if (p.houseReadings() != null) {
            for (NatalPortrait.HouseReading reading : p.houseReadings()) {
                if (reading == null) continue;
                if (reading.houseNumber() < 1 || reading.houseNumber() > 12) {
                    fatal.add("house reading out of range: " + reading.houseNumber());
                }
                if (isBlank(reading.synthesis())) {
                    fatal.add("house reading " + reading.houseNumber() + " has no synthesis");
                }
            }
        }

        allTopics(p).forEach(t -> {
            if (isBlank(t.summary())) fatal.add("topic " + t.id() + " has empty summary");
            if (t.summary() != null && t.summary().length() > MAX_SUMMARY_CHARS) {
                warnings.add("topic " + t.id() + " summary exceeds " + MAX_SUMMARY_CHARS + " chars");
            }
            if (t.dailyLife() != null && t.dailyLife().length() > MAX_LINE_CHARS) {
                warnings.add("topic " + t.id() + " dailyLife too long");
            }
        });
    }

    private void checkBigThree(NatalPortrait.BigThreeEntry entry, String key, List<String> fatal) {
        if (isBlank(entry.title()) || isBlank(entry.meaning()) || isBlank(entry.howItWorksInYou())) {
            fatal.add("bigThree." + key + " is incomplete");
        }
    }

    // ---------------------------------------------------------------- evidence

    /**
     * Runs the hallucination guard over a bare evidence list.
     *
     * <p>Used by "Haritama Sor", where there is an answer and its receipts but no portrait
     * structure to validate around them.</p>
     *
     * @return the fatal problems found; empty means every claim matches the calculated chart.
     */
    public List<String> validateEvidence(List<NatalPortrait.Evidence> evidence, NormalizedNatalChart chart) {
        List<String> fatal = new ArrayList<>();
        checkEvidence(evidence, chart, fatal);
        return fatal;
    }

    private void validateEvidence(NatalPortrait p, NormalizedNatalChart chart, List<String> fatal) {
        checkEvidence(allEvidence(p), chart, fatal);
    }

    private void checkEvidence(List<NatalPortrait.Evidence> evidence, NormalizedNatalChart chart, List<String> fatal) {
        if (chart == null || evidence == null) return;

        Map<String, NormalizedNatalChart.NormalizedPlanet> planets = chart.planets() == null
                ? Map.of()
                : chart.planets().stream().collect(Collectors.toMap(
                        pl -> normalizeKey(pl.planet()), pl -> pl, (a, b) -> a));

        Set<String> aspectKeys = chart.aspects() == null ? Set.of() : chart.aspects().stream()
                .map(a -> aspectKey(a.planet1(), a.planet2(), a.type()))
                .collect(Collectors.toSet());

        Map<String, Double> aspectOrbs = chart.aspects() == null ? Map.of() : chart.aspects().stream()
                .collect(Collectors.toMap(
                        a -> aspectKey(a.planet1(), a.planet2(), a.type()),
                        NormalizedNatalChart.NormalizedAspect::orb,
                        (a, b) -> a));

        Map<Integer, String> houseSigns = chart.houses() == null ? Map.of() : chart.houses().stream()
                .collect(Collectors.toMap(
                        NormalizedNatalChart.NormalizedHouse::houseNumber,
                        h -> normalizeKey(h.sign()),
                        (a, b) -> a));

        for (NatalPortrait.Evidence ev : evidence) {
            if (ev == null) continue;
            String type = ev.type() == null ? "" : ev.type().toUpperCase(Locale.ROOT);

            switch (type) {
                case "PLACEMENT", "RULER" -> {
                    // The Ascendant is a chart angle, not a body, so it is checked against the
                    // calculated rising sign rather than the planet list.
                    if (isAscendant(ev.planet())) {
                        if (chart.ascendant() == null) {
                            fatal.add("evidence cites the Ascendant but the chart has no rising sign");
                        } else if (ev.sign() != null
                                && !normalizeKey(ev.sign()).equals(normalizeKey(chart.ascendant().sign()))) {
                            fatal.add("hallucinated Ascendant sign: claimed " + ev.sign()
                                    + ", chart has " + chart.ascendant().sign());
                        }
                        continue;
                    }

                    NormalizedNatalChart.NormalizedPlanet actual = planets.get(normalizeKey(ev.planet()));
                    if (ev.planet() != null && actual == null) {
                        fatal.add("evidence references unknown planet: " + ev.planet());
                        continue;
                    }
                    if (actual != null && ev.sign() != null
                            && !normalizeKey(ev.sign()).equals(normalizeKey(actual.sign()))) {
                        fatal.add("hallucinated sign: claimed " + ev.planet() + " in " + ev.sign()
                                + ", chart has " + actual.sign());
                    }
                    if (actual != null && ev.house() != null
                            && !ev.house().equals(actual.house())) {
                        fatal.add("hallucinated house: claimed " + ev.planet() + " in house " + ev.house()
                                + ", chart has " + actual.house());
                    }
                }
                case "ASPECT" -> {
                    if (ev.planet() == null || ev.planet2() == null || ev.aspectType() == null) {
                        fatal.add("aspect evidence missing planet/planet2/aspectType");
                        continue;
                    }
                    String key = aspectKey(ev.planet(), ev.planet2(), ev.aspectType());
                    if (!aspectKeys.contains(key)) {
                        fatal.add("hallucinated aspect: " + ev.planet() + " "
                                + ev.aspectType() + " " + ev.planet2());
                        continue;
                    }
                    Double actualOrb = aspectOrbs.get(key);
                    Double quoted = parseOrbFromLabel(ev.label());
                    if (actualOrb != null && quoted != null
                            && Math.abs(actualOrb - quoted) > ORB_TOLERANCE) {
                        fatal.add("orb mismatch for " + ev.planet() + "/" + ev.planet2()
                                + ": label says " + quoted + ", chart has " + actualOrb);
                    }
                }
                case "HOUSE" -> {
                    if (ev.house() == null) {
                        fatal.add("house evidence missing house number");
                    } else if (ev.house() < 1 || ev.house() > 12) {
                        fatal.add("house evidence out of range: " + ev.house());
                    } else if (ev.sign() != null && !houseSigns.isEmpty()) {
                        String actualSign = houseSigns.get(ev.house());
                        if (actualSign != null && !actualSign.equals(normalizeKey(ev.sign()))) {
                            fatal.add("hallucinated house cusp: house " + ev.house()
                                    + " claimed " + ev.sign());
                        }
                    }
                }
                default -> { /* ELEMENT and free-form labels carry no checkable claim. */ }
            }

            // Houses are meaningless without a birth time; quoting them would be a fabricated fact.
            if (!chart.birthTimeKnown() && ev.house() != null) {
                fatal.add("house evidence present but birth time is unknown");
            }
        }
    }

    // ---------------------------------------------------------------- repetition

    /**
     * Catches the failure this whole redesign exists to prevent: the model producing one generic
     * paragraph and pasting it under six different headings.
     */
    private void validateNoTemplateRepetition(NatalPortrait p, List<String> fatal, List<String> warnings) {
        List<String> bodies = new ArrayList<>();
        allTopics(p).forEach(t -> {
            if (!isBlank(t.summary())) bodies.add(fingerprint(t.summary()));
        });
        if (p.bigThree() != null) {
            for (NatalPortrait.BigThreeEntry e : bigThreeEntries(p)) {
                if (e != null && !isBlank(e.howItWorksInYou())) bodies.add(fingerprint(e.howItWorksInYou()));
            }
        }
        if (p.planetReadings() != null) {
            p.planetReadings().stream()
                    .filter(r -> r != null && !isBlank(r.howItShowsUpInYou()))
                    .forEach(r -> bodies.add(fingerprint(r.howItShowsUpInYou())));
            // Two planets in the same house must not share one house paragraph.
            p.planetReadings().stream()
                    .filter(r -> r != null && !isBlank(r.whereTheHouseTakesIt()))
                    .forEach(r -> bodies.add(fingerprint(r.whereTheHouseTakesIt())));
        }
        if (p.houseReadings() != null) {
            p.houseReadings().stream()
                    .filter(r -> r != null && !isBlank(r.synthesis()))
                    .forEach(r -> bodies.add(fingerprint(r.synthesis())));
        }

        Set<String> seen = new HashSet<>();
        int duplicates = 0;
        for (String body : bodies) {
            if (!seen.add(body)) duplicates++;
        }
        if (duplicates > 0) {
            fatal.add(duplicates + " duplicated interpretation block(s) detected");
        }

        if (p.portrait() != null && p.portrait().traits() != null) {
            Set<String> uniqueTraits = p.portrait().traits().stream()
                    .filter(t -> t != null)
                    .map(this::normalizeKey)
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            if (uniqueTraits.size() < p.portrait().traits().size()) {
                warnings.add("duplicate trait chips");
            }
        }
    }

    // ---------------------------------------------------------------- helpers

    private List<NatalPortrait.BigThreeEntry> bigThreeEntries(NatalPortrait p) {
        if (p.bigThree() == null) return List.of();
        List<NatalPortrait.BigThreeEntry> out = new ArrayList<>();
        if (p.bigThree().sun() != null) out.add(p.bigThree().sun());
        if (p.bigThree().moon() != null) out.add(p.bigThree().moon());
        if (p.bigThree().ascendant() != null) out.add(p.bigThree().ascendant());
        return out;
    }

    private List<NatalPortrait.Topic> allTopics(NatalPortrait p) {
        List<NatalPortrait.Topic> out = new ArrayList<>();
        if (p.aboutMe() != null) out.addAll(p.aboutMe().stream().filter(t -> t != null).toList());
        if (p.lifeAreas() != null) out.addAll(p.lifeAreas().stream().filter(t -> t != null).toList());
        return out;
    }

    private List<NatalPortrait.Evidence> allEvidence(NatalPortrait p) {
        List<NatalPortrait.Evidence> out = new ArrayList<>();
        if (p.portrait() != null && p.portrait().evidence() != null) out.addAll(p.portrait().evidence());
        if (p.planetReadings() != null) {
            p.planetReadings().stream()
                    .filter(r -> r != null && r.evidence() != null)
                    .forEach(r -> out.addAll(r.evidence()));
        }
        if (p.houseReadings() != null) {
            p.houseReadings().stream()
                    .filter(r -> r != null && r.evidence() != null)
                    .forEach(r -> out.addAll(r.evidence()));
        }
        bigThreeEntries(p).forEach(e -> {
            if (e.evidence() != null) out.addAll(e.evidence());
        });
        allTopics(p).forEach(t -> {
            if (t.evidence() != null) out.addAll(t.evidence());
        });
        if (p.aspectStory() != null) {
            addThemeEvidence(p.aspectStory().supportive(), out);
            addThemeEvidence(p.aspectStory().tension(), out);
        }
        return out;
    }

    private void addThemeEvidence(List<NatalPortrait.AspectTheme> themes, List<NatalPortrait.Evidence> out) {
        if (themes == null) return;
        themes.stream()
                .filter(t -> t != null && t.evidence() != null)
                .forEach(t -> out.addAll(t.evidence()));
    }

    private Set<String> idsOf(List<NatalPortrait.Topic> topics) {
        if (topics == null) return Set.of();
        return topics.stream()
                .filter(t -> t != null && t.id() != null)
                .map(t -> t.id().toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
    }

    /** Order-independent key so "Sun SQUARE Node" and "Node SQUARE Sun" resolve to the same aspect. */
    private String aspectKey(String a, String b, String type) {
        String left = normalizeKey(a);
        String right = normalizeKey(b);
        String first = left.compareTo(right) <= 0 ? left : right;
        String second = left.compareTo(right) <= 0 ? right : left;
        return first + "|" + second + "|" + normalizeKey(type);
    }

    private Double parseOrbFromLabel(String label) {
        if (label == null) return null;
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("(\\d+[.,]?\\d*)\\s*°").matcher(label);
        if (!m.find()) return null;
        try {
            return Double.parseDouble(m.group(1).replace(',', '.'));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Collapses whitespace and case so near-identical paragraphs hash to the same value. */
    private String fingerprint(String text) {
        return text.toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N}]+", " ")
                .trim();
    }

    private String normalizeKey(String value) {
        if (value == null) return "";
        return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    /** "Ascendant", "ASC" and "Rising" all name the same calculated angle. */
    private boolean isAscendant(String planet) {
        String key = normalizeKey(planet);
        return key.equals("ascendant") || key.equals("asc") || key.equals("rising");
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
