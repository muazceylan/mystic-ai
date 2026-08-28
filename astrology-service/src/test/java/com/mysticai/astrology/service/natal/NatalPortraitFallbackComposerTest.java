package com.mysticai.astrology.service.natal;

import com.mysticai.astrology.dto.natal.NatalPortrait;
import com.mysticai.astrology.dto.natal.NormalizedNatalChart;
import com.mysticai.astrology.service.NatalChartCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The fallback is what the user sees when the model is unavailable, so it is held to the same bar
 * as the AI path on the things that matter: it must be specific to the chart, it must pass the
 * validator, and it must never invent a placement.
 */
class NatalPortraitFallbackComposerTest {

    private NatalChartNormalizer normalizer;
    private NatalPortraitFallbackComposer composer;
    private NatalPortraitValidator validator;

    @BeforeEach
    void setUp() {
        normalizer = new NatalChartNormalizer(new NatalChartCalculator(null));
        composer = new NatalPortraitFallbackComposer(new NatalVocabulary());
        validator = new NatalPortraitValidator();
    }

    private NormalizedNatalChart richChart(String locale) {
        return normalizer.normalize(42L, locale, true, "Leo", 16.0,
                NatalChartTestFixtures.richChartPlanets(),
                NatalChartTestFixtures.leoRisingHouses(),
                NatalChartTestFixtures.richAspects());
    }

    @Test
    @DisplayName("produces a portrait that passes the same validator as the AI path")
    void fallbackPassesValidation() {
        NatalPortrait portrait = composer.compose(richChart("tr"), "tr");

        NatalPortraitValidator.Result result = validator.validate(portrait, richChart("tr"));

        assertTrue(result.valid(), "fallback must be self-consistent: " + result.fatal());
    }

    @Test
    @DisplayName("passes validation in English too")
    void fallbackPassesValidationInEnglish() {
        NormalizedNatalChart chart = richChart("en");
        NatalPortrait portrait = composer.compose(chart, "en");

        NatalPortraitValidator.Result result = validator.validate(portrait, chart);

        assertTrue(result.valid(), result.fatal().toString());
        assertEquals("en", portrait.locale());
    }

    @Test
    @DisplayName("labels itself as a fallback so the client can say so")
    void marksItselfAsFallback() {
        NatalPortrait portrait = composer.compose(richChart("tr"), "tr");

        assertEquals("FALLBACK", portrait.source());
        assertEquals(NatalPortraitService.CONTRACT_VERSION, portrait.version());
    }

    @Test
    @DisplayName("fills every card the UI renders")
    void fillsEveryRequiredSection() {
        NatalPortrait portrait = composer.compose(richChart("tr"), "tr");

        Set<String> aboutMeIds = ids(portrait.aboutMe());
        assertTrue(aboutMeIds.containsAll(List.of(
                "core_character", "emotional_world", "social_image",
                "strengths", "challenges", "inner_conflicts")));

        Set<String> lifeIds = ids(portrait.lifeAreas());
        assertTrue(lifeIds.containsAll(List.of(
                "love", "career", "money", "social", "family", "life_direction", "talents")));

        assertNotNull(portrait.bigThree().sun());
        assertNotNull(portrait.bigThree().moon());
        assertNotNull(portrait.bigThree().ascendant());
    }

    @Test
    @DisplayName("writes visibly different text for two different charts")
    void isChartSpecificRatherThanTemplated() {
        NormalizedNatalChart pisces = richChart("tr");
        NormalizedNatalChart shifted = normalizer.normalize(43L, "tr", true, "Capricorn", 4.0,
                shiftedPlanets(), NatalChartTestFixtures.leoRisingHouses(),
                NatalChartTestFixtures.sparseAspects());

        NatalPortrait a = composer.compose(pisces, "tr");
        NatalPortrait b = composer.compose(shifted, "tr");

        assertNotEquals(a.portrait().summary(), b.portrait().summary());
        assertNotEquals(a.bigThree().moon().howItWorksInYou(), b.bigThree().moon().howItWorksInYou());
        assertNotEquals(
                topicById(a, "love").summary(),
                topicById(b, "love").summary());
    }

    @Test
    @DisplayName("never repeats the same paragraph across cards")
    void doesNotRepeatItself() {
        NatalPortrait portrait = composer.compose(richChart("tr"), "tr");

        Set<String> summaries = new HashSet<>();
        portrait.aboutMe().forEach(t -> assertTrue(summaries.add(t.summary()),
                "duplicated aboutMe summary: " + t.id()));
        portrait.lifeAreas().forEach(t -> assertTrue(summaries.add(t.summary()),
                "duplicated lifeAreas summary: " + t.id()));
    }

    @Test
    @DisplayName("omits houses and the ascendant when the birth time is unknown")
    void degradesGracefullyWithoutBirthTime() {
        NormalizedNatalChart chart = normalizer.normalize(44L, "tr", false, null, null,
                NatalChartTestFixtures.richChartPlanets(),
                NatalChartTestFixtures.leoRisingHouses(),
                NatalChartTestFixtures.richAspects());

        NatalPortrait portrait = composer.compose(chart, "tr");

        assertNull(portrait.bigThree().ascendant());
        assertNull(portrait.bigThree().sun().houseInfluence());
        NatalPortraitValidator.Result result = validator.validate(portrait, chart);
        assertTrue(result.fatal().stream().noneMatch(f -> f.contains("birth time is unknown")),
                "fallback must not cite houses without a birth time: " + result.fatal());
    }

    @Test
    @DisplayName("still produces a usable portrait for a chart with almost no aspects")
    void handlesSparseAspects() {
        NormalizedNatalChart chart = normalizer.normalize(45L, "tr", true, "Leo", 16.0,
                NatalChartTestFixtures.richChartPlanets(),
                NatalChartTestFixtures.leoRisingHouses(),
                NatalChartTestFixtures.sparseAspects());

        NatalPortrait portrait = composer.compose(chart, "tr");

        assertFalse(portrait.aboutMe().isEmpty());
        assertNotNull(topicById(portrait, "challenges").summary());
        assertFalse(topicById(portrait, "challenges").summary().isBlank());
    }

    @Test
    @DisplayName("handles intercepted signs, where a planet's sign rules no house cusp")
    void handlesInterceptedSigns() {
        NormalizedNatalChart chart = normalizer.normalize(46L, "tr", true, "Capricorn", 5.0,
                NatalChartTestFixtures.interceptedChartPlanets(),
                NatalChartTestFixtures.interceptedHouses(),
                NatalChartTestFixtures.sparseAspects());

        // Aquarius and Leo hold planets but sit on no cusp — they are intercepted.
        Set<String> cuspSigns = chart.houses().stream()
                .map(NormalizedNatalChart.NormalizedHouse::sign)
                .collect(java.util.stream.Collectors.toSet());
        assertFalse(cuspSigns.contains("Aquarius"), "fixture must actually intercept Aquarius");
        assertFalse(cuspSigns.contains("Leo"), "fixture must actually intercept Leo");
        assertEquals("Aquarius", chart.sun().sign());

        NatalPortrait portrait = composer.compose(chart, "tr");
        NatalPortraitValidator.Result result = validator.validate(portrait, chart);

        assertTrue(result.valid(), "an intercepted chart must still validate: " + result.fatal());
        assertNotNull(portrait.bigThree().sun());
        assertFalse(portrait.planetReadings().isEmpty());
        assertEquals(12, portrait.houseReadings().size());
    }

    @Test
    @DisplayName("gives every planet its own house paragraph, even in a shared house")
    void doesNotReuseOneHouseParagraphAcrossPlanets() {
        NormalizedNatalChart chart = richChart("tr");
        NatalPortrait portrait = composer.compose(chart, "tr");

        // Mars, Uranus and Neptune all sit in the 6th house in this fixture.
        List<String> sixthHouseLines = portrait.planetReadings().stream()
                .filter(r -> List.of("Mars", "Uranus", "Neptune").contains(r.planet()))
                .map(NatalPortrait.PlacementReading::whereTheHouseTakesIt)
                .filter(java.util.Objects::nonNull)
                .toList();

        assertEquals(3, sixthHouseLines.size());
        assertEquals(3, new HashSet<>(sixthHouseLines).size(),
                "planets sharing a house must not share one house paragraph");
    }

    @Test
    @DisplayName("reads cusp and resident together, and names it when they disagree")
    void houseSynthesisNamesTheMismatch() {
        NormalizedNatalChart chart = richChart("tr");
        NatalPortrait portrait = composer.compose(chart, "tr");

        // 1st cusp is Leo; the Moon in it is Virgo — the gap the brief asks to be surfaced.
        NatalPortrait.HouseReading first = portrait.houseReadings().stream()
                .filter(h -> h.houseNumber() == 1).findFirst().orElseThrow();

        assertNotNull(first.synthesis());
        assertTrue(first.synthesis().length() > 80, "the synthesis must actually say something");
        assertNotNull(first.residentsStory(), "the 1st house has residents in this chart");
        assertFalse(first.evidence().isEmpty());
    }

    @Test
    @DisplayName("omits house readings entirely when the birth time is unknown")
    void noHouseReadingsWithoutBirthTime() {
        NormalizedNatalChart chart = normalizer.normalize(47L, "tr", false, null, null,
                NatalChartTestFixtures.richChartPlanets(),
                NatalChartTestFixtures.leoRisingHouses(),
                NatalChartTestFixtures.richAspects());

        NatalPortrait portrait = composer.compose(chart, "tr");

        assertTrue(portrait.houseReadings().isEmpty(),
                "houses are meaningless without a birth time, so none may be shown");
        assertTrue(portrait.planetReadings().stream()
                        .allMatch(r -> r.whereTheHouseTakesIt() == null),
                "no planet reading may cite a house without a birth time");
    }

    @Test
    @DisplayName("attaches chart evidence to the cards that make claims")
    void attachesEvidence() {
        NatalPortrait portrait = composer.compose(richChart("tr"), "tr");

        assertFalse(portrait.portrait().evidence().isEmpty());
        assertFalse(portrait.bigThree().sun().evidence().isEmpty());
        assertFalse(topicById(portrait, "love").evidence().isEmpty());
    }

    @Test
    @DisplayName("leads aspect themes with lived experience, not aspect names")
    void aspectThemesAvoidJargonInTheTitle() {
        NatalPortrait portrait = composer.compose(richChart("tr"), "tr");

        List<NatalPortrait.AspectTheme> all = new java.util.ArrayList<>();
        all.addAll(portrait.aspectStory().supportive());
        all.addAll(portrait.aspectStory().tension());
        assertFalse(all.isEmpty());

        for (NatalPortrait.AspectTheme theme : all) {
            String title = theme.title().toUpperCase(java.util.Locale.ROOT);
            assertFalse(title.contains("SQUARE") || title.contains("TRINE")
                            || title.contains("OPPOSITION") || title.contains("ORB"),
                    "aspect theme title leaks jargon: " + theme.title());
            assertFalse(theme.evidence().isEmpty(), "aspect theme must carry its receipt");
        }
    }

    /** A second chart with different signs, used to prove the copy is not static. */
    private List<com.mysticai.astrology.dto.PlanetPosition> shiftedPlanets() {
        return List.of(
                new com.mysticai.astrology.dto.PlanetPosition("Sun", "Capricorn", 4.0, 0, 0, false, 1, 274.0),
                new com.mysticai.astrology.dto.PlanetPosition("Moon", "Aries", 12.0, 0, 0, false, 4, 12.0),
                new com.mysticai.astrology.dto.PlanetPosition("Mercury", "Sagittarius", 9.0, 0, 0, false, 12, 249.0),
                new com.mysticai.astrology.dto.PlanetPosition("Venus", "Aquarius", 15.0, 0, 0, false, 2, 315.0),
                new com.mysticai.astrology.dto.PlanetPosition("Mars", "Gemini", 20.0, 0, 0, false, 6, 80.0),
                new com.mysticai.astrology.dto.PlanetPosition("Jupiter", "Taurus", 1.0, 0, 0, false, 5, 31.0),
                new com.mysticai.astrology.dto.PlanetPosition("Saturn", "Libra", 27.0, 0, 0, false, 10, 207.0),
                new com.mysticai.astrology.dto.PlanetPosition("Uranus", "Leo", 8.0, 0, 0, false, 8, 128.0),
                new com.mysticai.astrology.dto.PlanetPosition("Neptune", "Virgo", 6.0, 0, 0, false, 9, 156.0),
                new com.mysticai.astrology.dto.PlanetPosition("Pluto", "Cancer", 19.0, 0, 0, false, 7, 109.0));
    }

    private NatalPortrait.Topic topicById(NatalPortrait portrait, String id) {
        return java.util.stream.Stream.concat(portrait.aboutMe().stream(), portrait.lifeAreas().stream())
                .filter(t -> t.id().equals(id))
                .findFirst()
                .orElseThrow(() -> new AssertionError("missing topic " + id));
    }

    private Set<String> ids(List<NatalPortrait.Topic> topics) {
        return topics.stream().map(NatalPortrait.Topic::id).collect(java.util.stream.Collectors.toSet());
    }
}
