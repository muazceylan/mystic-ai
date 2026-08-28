package com.mysticai.astrology.service.natal;

import com.mysticai.astrology.dto.natal.NatalPortrait;
import com.mysticai.astrology.dto.natal.NormalizedNatalChart;
import com.mysticai.astrology.service.NatalChartCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The hallucination guard is the load-bearing safety property of this feature, so these tests are
 * written from the attacker's side: each one asserts that a specific way of inventing chart data
 * gets caught.
 */
class NatalPortraitValidatorTest {

    private NatalPortraitValidator validator;
    private NormalizedNatalChart chart;

    @BeforeEach
    void setUp() {
        validator = new NatalPortraitValidator();
        chart = new NatalChartNormalizer(new NatalChartCalculator(null)).normalize(
                42L, "tr", true, "Leo", 16.0,
                NatalChartTestFixtures.richChartPlanets(),
                NatalChartTestFixtures.leoRisingHouses(),
                NatalChartTestFixtures.richAspects());
    }

    @Test
    @DisplayName("accepts a portrait whose every claim matches the chart")
    void acceptsTruthfulPortrait() {
        NatalPortraitValidator.Result result = validator.validate(validPortrait(), chart);

        assertTrue(result.valid(), "unexpected failures: " + result.fatal());
    }

    @Test
    @DisplayName("rejects a sign the chart does not have")
    void rejectsHallucinatedSign() {
        NatalPortrait portrait = withPortraitEvidence(
                evidence("PLACEMENT", "Güneş Aslan", "Sun", "Leo", null, null, null));

        NatalPortraitValidator.Result result = validator.validate(portrait, chart);

        assertFalse(result.valid());
        assertTrue(result.fatal().stream().anyMatch(f -> f.contains("hallucinated sign")),
                result.fatal().toString());
    }

    @Test
    @DisplayName("rejects a house the planet is not in")
    void rejectsHallucinatedHouse() {
        NatalPortrait portrait = withPortraitEvidence(
                evidence("PLACEMENT", "Güneş Balık · 4. Ev", "Sun", "Pisces", 4, null, null));

        NatalPortraitValidator.Result result = validator.validate(portrait, chart);

        assertFalse(result.valid());
        assertTrue(result.fatal().stream().anyMatch(f -> f.contains("hallucinated house")),
                result.fatal().toString());
    }

    @Test
    @DisplayName("rejects an aspect that was never calculated")
    void rejectsHallucinatedAspect() {
        NatalPortrait portrait = withPortraitEvidence(
                evidence("ASPECT", "Güneş △ Ay", "Sun", null, null, "TRINE", "Moon"));

        NatalPortraitValidator.Result result = validator.validate(portrait, chart);

        assertFalse(result.valid());
        assertTrue(result.fatal().stream().anyMatch(f -> f.contains("hallucinated aspect")),
                result.fatal().toString());
    }

    @Test
    @DisplayName("accepts an aspect quoted in either planet order")
    void acceptsAspectInEitherOrder() {
        NatalPortrait portrait = withPortraitEvidence(
                evidence("ASPECT", "Kuzey Ay Düğümü □ Güneş · 0.13°",
                        "NorthNode", null, null, "SQUARE", "Sun"));

        NatalPortraitValidator.Result result = validator.validate(portrait, chart);

        assertTrue(result.valid(), result.fatal().toString());
    }

    @Test
    @DisplayName("rejects an orb that does not match the calculated one")
    void rejectsOrbMismatch() {
        NatalPortrait portrait = withPortraitEvidence(
                evidence("ASPECT", "Güneş □ Kuzey Ay Düğümü · 4.80°",
                        "Sun", null, null, "SQUARE", "NorthNode"));

        NatalPortraitValidator.Result result = validator.validate(portrait, chart);

        assertFalse(result.valid());
        assertTrue(result.fatal().stream().anyMatch(f -> f.contains("orb mismatch")),
                result.fatal().toString());
    }

    @Test
    @DisplayName("rejects a planet that is not in the chart at all")
    void rejectsUnknownPlanet() {
        NatalPortrait portrait = withPortraitEvidence(
                evidence("PLACEMENT", "Lilith Boğa", "Lilith", "Taurus", null, null, null));

        NatalPortraitValidator.Result result = validator.validate(portrait, chart);

        assertFalse(result.valid());
        assertTrue(result.fatal().stream().anyMatch(f -> f.contains("unknown planet")),
                result.fatal().toString());
    }

    @Test
    @DisplayName("rejects a house cusp sign the chart does not have")
    void rejectsHallucinatedHouseCusp() {
        NatalPortrait portrait = withPortraitEvidence(
                evidence("HOUSE", "7. Ev · Koç", null, "Aries", 7, null, null));

        NatalPortraitValidator.Result result = validator.validate(portrait, chart);

        assertFalse(result.valid());
        assertTrue(result.fatal().stream().anyMatch(f -> f.contains("hallucinated house cusp")),
                result.fatal().toString());
    }

    @Test
    @DisplayName("rejects any house reference when the birth time is unknown")
    void rejectsHouseEvidenceWithoutBirthTime() {
        NormalizedNatalChart noTime = new NatalChartNormalizer(new NatalChartCalculator(null)).normalize(
                42L, "tr", false, null, null,
                NatalChartTestFixtures.richChartPlanets(),
                NatalChartTestFixtures.leoRisingHouses(),
                NatalChartTestFixtures.richAspects());

        NatalPortrait portrait = withPortraitEvidence(
                evidence("PLACEMENT", "Güneş Balık · 8. Ev", "Sun", "Pisces", 8, null, null));

        NatalPortraitValidator.Result result = validator.validate(portrait, noTime);

        assertFalse(result.valid());
        assertTrue(result.fatal().stream().anyMatch(f -> f.contains("birth time is unknown")),
                result.fatal().toString());
    }

    @Test
    @DisplayName("rejects a missing required topic")
    void rejectsMissingTopic() {
        NatalPortrait base = validPortrait();
        List<NatalPortrait.Topic> trimmed = base.aboutMe().stream()
                .filter(t -> !t.id().equals("emotional_world"))
                .toList();
        NatalPortrait portrait = copyWithAboutMe(base, trimmed);

        NatalPortraitValidator.Result result = validator.validate(portrait, chart);

        assertFalse(result.valid());
        assertTrue(result.fatal().stream().anyMatch(f -> f.contains("emotional_world")),
                result.fatal().toString());
    }

    @Test
    @DisplayName("rejects the same paragraph pasted under two headings")
    void rejectsDuplicatedInterpretationBlocks() {
        NatalPortrait base = validPortrait();
        String shared = base.aboutMe().get(0).summary();
        List<NatalPortrait.Topic> duplicated = base.aboutMe().stream()
                .map(t -> new NatalPortrait.Topic(t.id(), t.title(), t.subtitle(), shared,
                        t.dailyLife(), t.strengths(), t.challenges(), t.evidence()))
                .toList();
        NatalPortrait portrait = copyWithAboutMe(base, duplicated);

        NatalPortraitValidator.Result result = validator.validate(portrait, chart);

        assertFalse(result.valid());
        assertTrue(result.fatal().stream().anyMatch(f -> f.contains("duplicated interpretation")),
                result.fatal().toString());
    }

    @Test
    @DisplayName("rejects a portrait with too few trait chips")
    void rejectsThinPortrait() {
        NatalPortrait base = validPortrait();
        NatalPortrait portrait = new NatalPortrait(base.version(), base.locale(), base.source(),
                new NatalPortrait.Portrait("Headline", "Summary here.", List.of("Deep"), List.of()),
                base.bigThree(), base.aboutMe(), base.lifeAreas(),
                base.planetReadings(), base.houseReadings(), base.aspectStory());

        NatalPortraitValidator.Result result = validator.validate(portrait, chart);

        assertFalse(result.valid());
        assertTrue(result.fatal().stream().anyMatch(f -> f.contains("traits")),
                result.fatal().toString());
    }

    @Test
    @DisplayName("validateEvidence checks a bare evidence list for the ask flow")
    void validatesBareEvidenceList() {
        assertTrue(validator.validateEvidence(
                List.of(evidence("PLACEMENT", "Ay Başak · 1. Ev", "Moon", "Virgo", 1, null, null)),
                chart).isEmpty());

        assertFalse(validator.validateEvidence(
                List.of(evidence("PLACEMENT", "Ay Koç · 1. Ev", "Moon", "Aries", 1, null, null)),
                chart).isEmpty());
    }

    // ------------------------------------------------------------------ builders

    private NatalPortrait validPortrait() {
        List<NatalPortrait.Evidence> sunEvidence = List.of(
                evidence("PLACEMENT", "Güneş Balık · 8. Ev", "Sun", "Pisces", 8, null, null));
        List<NatalPortrait.Evidence> moonEvidence = List.of(
                evidence("PLACEMENT", "Ay Başak · 1. Ev", "Moon", "Virgo", 1, null, null));

        NatalPortrait.BigThree bigThree = new NatalPortrait.BigThree(
                bigThreeEntry("Güneşin Balık'ta", "Yüzeyin altına bakmaya yatkınsın.", sunEvidence),
                bigThreeEntry("Ayın Başak'ta", "Duygularını analiz ederek anlamlandırıyorsun.", moonEvidence),
                bigThreeEntry("Aslan Yükselen", "Dışarıdan sıcak ve kendinden emin görünüyorsun.", List.of()));

        List<NatalPortrait.Topic> aboutMe = new ArrayList<>();
        aboutMe.add(topic("core_character", "Kimliğin merkezinde derinlik arayışı var.", sunEvidence));
        aboutMe.add(topic("emotional_world", "Ruh halin gündelik düzenle sıkı sıkıya bağlı.", moonEvidence));
        aboutMe.add(topic("social_image", "İnsanlar seni rahat ve görünür biri olarak okuyor.", List.of()));
        aboutMe.add(topic("strengths", "Sezgi ve analiz sende aynı anda çalışabiliyor.", List.of()));
        aboutMe.add(topic("challenges", "Niyet okumaya fazla enerji harcayabilirsin.", List.of()));
        aboutMe.add(topic("inner_conflicts", "Görünür olmakla korunmak arasında gidip geliyorsun.", List.of()));

        List<NatalPortrait.Topic> lifeAreas = new ArrayList<>();
        lifeAreas.add(topic("love", "Yakınlıkta güven, senin için sıcaklıktan önce geliyor.", List.of()));
        lifeAreas.add(topic("career", "Detayı görebildiğin rollerde daha rahat çalışıyorsun.", List.of()));
        lifeAreas.add(topic("life_direction", "Yeni alanlara açılmak sana yabancı ama doğru geliyor.", List.of()));

        NatalPortrait.AspectStory story = new NatalPortrait.AspectStory(
                List.of(new NatalPortrait.AspectTheme(
                        "Duygularınla değerlerin aynı yöne bakıyor",
                        "İstediğin şeyle iyi hissettiğin şey çoğu zaman çakışıyor.",
                        List.of(evidence("ASPECT", "Ay △ Venüs · 1.10°",
                                "Moon", null, null, "TRINE", "Venus")))),
                List.of(new NatalPortrait.AspectTheme(
                        "Kendin olmakla ilerlemen gereken yön arasında gerilim",
                        "Bir tarafın doğal halinde kalmak isterken diğer tarafın değişmeni istiyor.",
                        List.of(evidence("ASPECT", "Güneş □ Kuzey Ay Düğümü · 0.13°",
                                "Sun", null, null, "SQUARE", "NorthNode")))));

        return new NatalPortrait("natal_interpretation_v2", "tr", "AI",
                new NatalPortrait.Portrait(
                        "Derin bir iç dünya, analitik duygular",
                        "Sezgiyle analizi aynı anda kullanan bir yapın var.",
                        List.of("Sezgisel", "Analitik", "Derin", "Duyarlı"),
                        sunEvidence),
                bigThree, aboutMe, lifeAreas, List.of(), List.of(), story);
    }

    private NatalPortrait.BigThreeEntry bigThreeEntry(
            String title, String how, List<NatalPortrait.Evidence> evidence) {
        return new NatalPortrait.BigThreeEntry(title, "Rol", "Anlam cümlesi.", how,
                List.of("Güçlü yan"), List.of("Zorlanma"), null, List.of(), evidence);
    }

    private NatalPortrait.Topic topic(String id, String summary, List<NatalPortrait.Evidence> evidence) {
        return new NatalPortrait.Topic(id, "Başlık", "Alt başlık", summary,
                "Günlük hayatta böyle görünür.", List.of("Güç"), List.of("Zorluk"), evidence);
    }

    private NatalPortrait.Evidence evidence(String type, String label, String planet, String sign,
                                            Integer house, String aspectType, String planet2) {
        return new NatalPortrait.Evidence(type, label, planet, sign, house, aspectType, planet2);
    }

    private NatalPortrait withPortraitEvidence(NatalPortrait.Evidence evidence) {
        NatalPortrait base = validPortrait();
        return new NatalPortrait(base.version(), base.locale(), base.source(),
                new NatalPortrait.Portrait(base.portrait().headline(), base.portrait().summary(),
                        base.portrait().traits(), List.of(evidence)),
                base.bigThree(), base.aboutMe(), base.lifeAreas(),
                base.planetReadings(), base.houseReadings(), base.aspectStory());
    }

    private NatalPortrait copyWithAboutMe(NatalPortrait base, List<NatalPortrait.Topic> aboutMe) {
        return new NatalPortrait(base.version(), base.locale(), base.source(), base.portrait(),
                base.bigThree(), aboutMe, base.lifeAreas(),
                base.planetReadings(), base.houseReadings(), base.aspectStory());
    }
}
