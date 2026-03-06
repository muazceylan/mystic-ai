package com.mysticai.astrology.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.*;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.entity.SavedPerson;
import com.mysticai.astrology.entity.Synastry;
import com.mysticai.astrology.repository.NatalChartRepository;
import com.mysticai.astrology.repository.SavedPersonRepository;
import com.mysticai.astrology.repository.SynastryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchTraitsServiceTest {

    @Mock
    private SynastryRepository synastryRepository;
    @Mock
    private NatalChartRepository natalChartRepository;
    @Mock
    private SavedPersonRepository savedPersonRepository;
    @Mock
    private TraitScoringEngine traitScoringEngine;
    @Mock
    private LlmNotesService llmNotesService;

    private MatchTraitsService service;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        service = new MatchTraitsService(
                synastryRepository,
                natalChartRepository,
                savedPersonRepository,
                objectMapper,
                traitScoringEngine,
                llmNotesService
        );
        stubLegacyPipeline();
    }

    @Test
    void shouldUseDifferentMetricSetsForDifferentModules() throws Exception {
        Long matchId = 100L;
        Synastry synastry = baseSynastry(matchId, "LOVE", 74, sampleAspectsMixed(), 12L, 33L);
        when(synastryRepository.findById(matchId)).thenReturn(Optional.of(synastry));

        MatchTraitsResponse love = service.getTraitsForMatch(matchId, "LOVE");
        MatchTraitsResponse work = service.getTraitsForMatch(matchId, "WORK");

        assertEquals("LOVE", love.module());
        assertEquals("WORK", work.module());
        assertEquals(5, love.metricCards().size());
        assertEquals(5, work.metricCards().size());

        Set<String> loveTitles = love.metricCards().stream().map(MatchTraitsResponse.MetricCard::title).collect(Collectors.toSet());
        Set<String> workTitles = work.metricCards().stream().map(MatchTraitsResponse.MetricCard::title).collect(Collectors.toSet());

        assertTrue(loveTitles.contains("Çekim"));
        assertTrue(workTitles.contains("Plan Uyumu"));
        assertNotEquals(loveTitles, workTitles);
    }

    @Test
    void shouldApplyConfidenceDampingWhenBirthDataIsLimited() throws Exception {
        Long highConfidenceMatchId = 201L;
        Long lowConfidenceMatchId = 202L;

        Synastry highConfidenceSynastry = baseSynastry(
                highConfidenceMatchId,
                "LOVE",
                88,
                sampleAspectsSupportiveDense(),
                101L,
                301L
        );
        Synastry lowConfidenceSynastry = baseSynastry(
                lowConfidenceMatchId,
                "LOVE",
                88,
                sampleAspectsSupportiveDense(),
                102L,
                302L
        );

        when(synastryRepository.findById(highConfidenceMatchId)).thenReturn(Optional.of(highConfidenceSynastry));
        when(synastryRepository.findById(lowConfidenceMatchId)).thenReturn(Optional.of(lowConfidenceSynastry));

        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDesc("101"))
                .thenReturn(Optional.of(buildNatalChart("101", LocalTime.of(9, 30), true)));
        when(savedPersonRepository.findById(301L))
                .thenReturn(Optional.of(buildSavedPerson(301L, LocalTime.of(10, 15), true)));

        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDesc("102"))
                .thenReturn(Optional.empty());
        when(savedPersonRepository.findById(302L))
                .thenReturn(Optional.empty());

        MatchTraitsResponse high = service.getTraitsForMatch(highConfidenceMatchId, "LOVE");
        MatchTraitsResponse low = service.getTraitsForMatch(lowConfidenceMatchId, "LOVE");

        assertTrue(high.overall().confidence() > low.overall().confidence());
        assertTrue(Math.abs(high.overall().score() - 60) > Math.abs(low.overall().score() - 60));
        assertEquals("low_confidence_damped", low.explainability().distributionWarning());
        assertNotNull(low.explainability().missingBirthTimeImpact());
    }

    @Test
    void shouldEmitHousePrecisionLimitedWarningWhenBirthTimeIsNoonOrHouseDataMissing() throws Exception {
        Long matchId = 203L;
        Synastry synastry = baseSynastry(matchId, "WORK", 66, sampleAspectsMixed(), 200L, 400L);
        when(synastryRepository.findById(matchId)).thenReturn(Optional.of(synastry));

        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDesc("200"))
                .thenReturn(Optional.of(buildNatalChart("200", LocalTime.NOON, false)));
        when(savedPersonRepository.findById(400L))
                .thenReturn(Optional.of(buildSavedPerson(400L, LocalTime.NOON, false)));

        MatchTraitsResponse response = service.getTraitsForMatch(matchId, "WORK");

        assertEquals("WORK", response.module());
        assertEquals("house_precision_limited", response.explainability().distributionWarning());
        assertNotNull(response.explainability().missingBirthTimeImpact());
    }

    @Test
    void shouldAvoidNoisyClusteredWarningForHighUniformMetrics() throws Exception {
        Long matchId = 204L;
        Synastry synastry = baseSynastry(matchId, "RIVAL", 60, sampleAspectsClustered(), 300L, 500L);
        when(synastryRepository.findById(matchId)).thenReturn(Optional.of(synastry));

        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDesc("300"))
                .thenReturn(Optional.of(buildNatalChart("300", LocalTime.of(8, 40), true)));
        when(savedPersonRepository.findById(500L))
                .thenReturn(Optional.of(buildSavedPerson(500L, LocalTime.of(8, 35), true)));

        MatchTraitsResponse response = service.getTraitsForMatch(matchId, "RIVAL");

        assertEquals("RIVAL", response.module());
        assertNull(response.explainability().distributionWarning());
        assertNotNull(response.metricCards());
        assertEquals(5, response.metricCards().size());
    }

    @Test
    void shouldBuildDeterministicAndDistinctTopDrivers() throws Exception {
        Long matchId = 205L;
        Synastry synastry = baseSynastry(matchId, "FRIEND", 71, sampleAspectsMixed(), 12L, 33L);
        when(synastryRepository.findById(matchId)).thenReturn(Optional.of(synastry));

        MatchTraitsResponse first = service.getTraitsForMatch(matchId, "FRIEND");
        MatchTraitsResponse second = service.getTraitsForMatch(matchId, "FRIEND");

        assertEquals(first.topDrivers(), second.topDrivers());
        assertFalse(first.topDrivers().supportive().isEmpty());
        assertFalse(first.topDrivers().challenging().isEmpty());
        assertFalse(first.topDrivers().growth().isEmpty());

        String supportiveTitle = first.topDrivers().supportive().getFirst().title();
        String challengingTitle = first.topDrivers().challenging().getFirst().title();
        String growthTitle = first.topDrivers().growth().getFirst().title();

        assertNotEquals(supportiveTitle, challengingTitle);
        assertNotEquals(supportiveTitle, growthTitle);
        assertNotEquals(challengingTitle, growthTitle);
    }

    @Test
    void shouldUseCacheForSameFingerprintAndInvalidateWhenDataChanges() throws Exception {
        Long matchId = 206L;
        Synastry firstSynastry = baseSynastry(matchId, "LOVE", 72, sampleAspectsMixed(), 12L, 33L);
        Synastry changedSynastry = baseSynastry(matchId, "LOVE", 41, sampleAspectsChallenging(), 12L, 33L);

        when(synastryRepository.findById(matchId))
                .thenReturn(Optional.of(firstSynastry))
                .thenReturn(Optional.of(firstSynastry))
                .thenReturn(Optional.of(changedSynastry));

        MatchTraitsResponse first = service.getTraitsForMatch(matchId, "LOVE");
        MatchTraitsResponse second = service.getTraitsForMatch(matchId, "LOVE");
        MatchTraitsResponse third = service.getTraitsForMatch(matchId, "LOVE");

        assertEquals(first.overall().score(), second.overall().score());
        assertEquals(first.explainability().generatedAt(), second.explainability().generatedAt());

        assertNotEquals(first.overall().score(), third.overall().score());
        assertNotEquals(first.explainability().generatedAt(), third.explainability().generatedAt());
    }

    @Test
    void shouldProduceMissingBirthTimeImpactOnlyWhenPrecisionIsLimited() throws Exception {
        Long preciseMatchId = 207L;
        Long limitedMatchId = 208L;

        Synastry precise = baseSynastry(preciseMatchId, "FAMILY", 64, sampleAspectsMixed(), 555L, 556L);
        Synastry limited = baseSynastry(limitedMatchId, "FAMILY", 64, sampleAspectsMixed(), 557L, 558L);

        when(synastryRepository.findById(preciseMatchId)).thenReturn(Optional.of(precise));
        when(synastryRepository.findById(limitedMatchId)).thenReturn(Optional.of(limited));

        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDesc("555"))
                .thenReturn(Optional.of(buildNatalChart("555", LocalTime.of(6, 15), true)));
        when(savedPersonRepository.findById(556L))
                .thenReturn(Optional.of(buildSavedPerson(556L, LocalTime.of(6, 5), true)));

        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDesc("557"))
                .thenReturn(Optional.of(buildNatalChart("557", LocalTime.NOON, false)));
        when(savedPersonRepository.findById(558L))
                .thenReturn(Optional.of(buildSavedPerson(558L, LocalTime.NOON, false)));

        MatchTraitsResponse preciseResponse = service.getTraitsForMatch(preciseMatchId, "FAMILY");
        MatchTraitsResponse limitedResponse = service.getTraitsForMatch(limitedMatchId, "FAMILY");

        assertNull(preciseResponse.explainability().missingBirthTimeImpact());
        assertNotNull(limitedResponse.explainability().missingBirthTimeImpact());
    }

    @Test
    void shouldRebalanceTopHeavyLoveScoresIntoCredibleBands() throws Exception {
        Long matchId = 209L;
        Synastry synastry = baseSynastry(matchId, "LOVE", 91, sampleAspectsSupportiveDense(), 601L, 701L);
        when(synastryRepository.findById(matchId)).thenReturn(Optional.of(synastry));

        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDesc("601"))
                .thenReturn(Optional.of(buildNatalChart("601", LocalTime.of(9, 5), true)));
        when(savedPersonRepository.findById(701L))
                .thenReturn(Optional.of(buildSavedPerson(701L, LocalTime.of(9, 25), true)));

        MatchTraitsResponse response = service.getTraitsForMatch(matchId, "LOVE");

        List<Integer> scores = response.metricCards().stream().map(MatchTraitsResponse.MetricCard::score).toList();
        long over80 = scores.stream().filter(score -> score >= 80).count();
        long over85 = scores.stream().filter(score -> score >= 85).count();
        int min = scores.stream().min(Integer::compareTo).orElseThrow();
        int max = scores.stream().max(Integer::compareTo).orElseThrow();
        int spread = max - min;

        assertTrue(over80 <= 3, "love metrics should not all stay in the 80+ band");
        assertTrue(over85 <= 1, "90-like rare strengths should stay limited");
        assertTrue(min <= 68, "at least one metric should fall below the 70 band");
        assertTrue(max <= 83, "top edge should be compressed unless signals are extreme");
        assertTrue(spread >= 12, "metric scores should not collapse into the same upper-mid band");
        assertTrue(response.overall().score() <= 81, "overall love score should not remain top-heavy by default");
        assertNotEquals("scores_clustered", response.explainability().distributionWarning(), "top-heavy but differentiated results should not look clustered");
    }

    @Test
    void shouldDifferentiateModulesWhenLoveIsStrongButWorkIsStrained() throws Exception {
        Long matchId = 212L;
        Synastry synastry = baseSynastry(matchId, "LOVE", 76, sampleAspectsLoveHighWorkLow(), 604L, 704L);
        when(synastryRepository.findById(matchId)).thenReturn(Optional.of(synastry));

        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDesc("604"))
                .thenReturn(Optional.of(buildNatalChart("604", LocalTime.of(8, 10), true)));
        when(savedPersonRepository.findById(704L))
                .thenReturn(Optional.of(buildSavedPerson(704L, LocalTime.of(8, 5), true)));

        MatchTraitsResponse love = service.getTraitsForMatch(matchId, "LOVE");
        MatchTraitsResponse work = service.getTraitsForMatch(matchId, "WORK");
        MatchTraitsResponse family = service.getTraitsForMatch(matchId, "FAMILY");
        MatchTraitsResponse rival = service.getTraitsForMatch(matchId, "RIVAL");

        List<Integer> moduleScores = List.of(
                love.overall().score(),
                work.overall().score(),
                family.overall().score(),
                rival.overall().score()
        );

        int max = moduleScores.stream().max(Integer::compareTo).orElseThrow();
        int min = moduleScores.stream().min(Integer::compareTo).orElseThrow();

        String debugScores = "love=%d work=%d family=%d rival=%d".formatted(
                love.overall().score(),
                work.overall().score(),
                family.overall().score(),
                rival.overall().score()
        );
        assertTrue(love.overall().score() >= 72, "love should stay clearly stronger with tight romantic aspects: " + debugScores);
        assertTrue(work.overall().score() <= 56, "work should drop when Mercury/Saturn/Mars signatures are strained: " + debugScores);
        assertTrue(love.overall().score() - work.overall().score() >= 18, "module scores should not collapse into the same band: " + debugScores);
        assertTrue(max - min >= 18, "same pair should produce a meaningful module spread: " + debugScores);
    }

    @Test
    void shouldGenerateExpertNarrativeWithoutGenericPhrases() throws Exception {
        Long matchId = 210L;
        Synastry synastry = baseSynastry(matchId, "LOVE", 82, sampleAspectsMixed(), 602L, 702L);
        when(synastryRepository.findById(matchId)).thenReturn(Optional.of(synastry));

        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDesc("602"))
                .thenReturn(Optional.of(buildNatalChart("602", LocalTime.of(8, 50), true)));
        when(savedPersonRepository.findById(702L))
                .thenReturn(Optional.of(buildSavedPerson(702L, LocalTime.of(8, 45), true)));

        MatchTraitsResponse response = service.getTraitsForMatch(matchId, "LOVE");

        String headline = response.summary().headline();
        String shortNarrative = response.summary().shortNarrative().toLowerCase();
        String headlineLower = headline.toLowerCase();
        String dailyHint = response.summary().dailyLifeHint();
        String dailyHintLower = dailyHint.toLowerCase();

        assertTrue(headline.split("\\s+").length >= 4 && headline.split("\\s+").length <= 8);
        assertTrue(response.summary().shortNarrative().length() >= 220 && response.summary().shortNarrative().length() <= 360);
        assertTrue(dailyHint.length() >= 60 && dailyHint.length() <= 110);

        assertFalse(headlineLower.contains("genel akış"));
        assertFalse(headlineLower.contains("bu alanda"));
        assertFalse(headlineLower.contains("belirleyici olabilir"));
        assertFalse(shortNarrative.contains("genel akış"));
        assertFalse(shortNarrative.contains("destekleyici görünüyor"));
        assertFalse(shortNarrative.contains("bu alanda"));
        assertFalse(shortNarrative.contains("güçlendiriyor"));
        assertFalse(shortNarrative.contains("başlığında"));
        assertFalse(shortNarrative.contains("hissedilebilir"));
        assertFalse(dailyHintLower.contains("genel akış"));
        assertFalse(dailyHintLower.contains("bu alanda"));
        assertFalse(dailyHintLower.contains("belirleyici olabilir"));
    }

    @Test
    void shouldProduceSpecificThemeInsightsAndVaryNarrativeByModule() throws Exception {
        Long matchId = 211L;
        Synastry synastry = baseSynastry(matchId, "LOVE", 74, sampleAspectsMixed(), 603L, 703L);
        when(synastryRepository.findById(matchId)).thenReturn(Optional.of(synastry));

        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDesc("603"))
                .thenReturn(Optional.of(buildNatalChart("603", LocalTime.of(7, 30), true)));
        when(savedPersonRepository.findById(703L))
                .thenReturn(Optional.of(buildSavedPerson(703L, LocalTime.of(7, 20), true)));

        MatchTraitsResponse love = service.getTraitsForMatch(matchId, "LOVE");
        MatchTraitsResponse work = service.getTraitsForMatch(matchId, "WORK");

        assertNotEquals(love.summary().headline(), work.summary().headline());
        assertNotEquals(love.summary().shortNarrative(), work.summary().shortNarrative());

        List<String> themeInsights = love.themeSections().stream()
                .map(MatchTraitsResponse.ThemeSection::miniInsight)
                .toList();

        assertFalse(themeInsights.isEmpty());
        for (String insight : themeInsights) {
            String normalized = insight.toLowerCase();
            assertFalse(normalized.contains("genel akış"));
            assertFalse(normalized.contains("destekleyici görünüyor"));
            assertFalse(normalized.contains("başlığında"));
            assertFalse(normalized.contains("bu alanda"));
            assertFalse(normalized.contains("hissedilebilir"));
            assertTrue(
                    normalized.contains("bir taraf")
                            || normalized.contains("biriniz")
                            || normalized.contains("biri")
                            || normalized.contains("diğeri"),
                    "theme insight should describe a relational difference"
            );
        }

        for (MatchTraitsResponse.MetricCard metricCard : love.metricCards()) {
            String normalized = metricCard.insight().toLowerCase();
            assertFalse(normalized.contains("genel akış"));
            assertFalse(normalized.contains("destekleyici görünüyor"));
            assertFalse(normalized.contains("bu alanda"));
            assertFalse(normalized.contains("hissedilebilir"));
            assertFalse(normalized.contains("belirleyici olabilir"));
        }
    }

    private void stubLegacyPipeline() {
        when(traitScoringEngine.scoreCategories(anyList(), anyInt())).thenReturn(List.of());
        when(traitScoringEngine.applyNotes(anyList(), anyMap())).thenAnswer(invocation -> invocation.getArgument(0));
        when(traitScoringEngine.selectCardAxes(anyList(), anyInt())).thenReturn(List.of());
        when(traitScoringEngine.applyNotesToAxes(anyList(), anyMap())).thenAnswer(invocation -> invocation.getArgument(0));
        when(llmNotesService.generateNotes(anyList(), anyInt()))
                .thenReturn(new LlmNotesService.NotesResult(null, Map.of()));
    }

    private Synastry baseSynastry(
            Long matchId,
            String relationshipType,
            int harmonyScore,
            List<CrossAspect> aspects,
            Long userId,
            Long personBId
    ) throws Exception {
        return Synastry.builder()
                .id(matchId)
                .userId(userId)
                .savedPersonId(personBId)
                .personAType("USER")
                .personBType("SAVED_PERSON")
                .personBId(personBId)
                .relationshipType(relationshipType)
                .harmonyScore(harmonyScore)
                .status("COMPLETED")
                .crossAspectsJson(objectMapper.writeValueAsString(aspects))
                .build();
    }

    private NatalChart buildNatalChart(String userId, LocalTime birthTime, boolean withHouseData) throws Exception {
        return NatalChart.builder()
                .id(10L)
                .userId(userId)
                .name("Test User")
                .birthDate(LocalDate.of(1990, 1, 1))
                .birthTime(birthTime)
                .planetPositionsJson(objectMapper.writeValueAsString(samplePlanets()))
                .housePlacementsJson(withHouseData ? "{\"1\":\"Sun\"}" : "{}")
                .calculatedAt(LocalDateTime.now().minusMinutes(10))
                .build();
    }

    private SavedPerson buildSavedPerson(Long id, LocalTime birthTime, boolean withHouseData) throws Exception {
        return SavedPerson.builder()
                .id(id)
                .userId(99L)
                .name("Partner")
                .birthDate(LocalDate.of(1992, 4, 20))
                .birthTime(birthTime)
                .planetPositionsJson(objectMapper.writeValueAsString(samplePlanets()))
                .housePlacementsJson(withHouseData ? "{\"7\":\"Moon\"}" : "{}")
                .updatedAt(LocalDateTime.now().minusMinutes(5))
                .build();
    }

    private List<PlanetPosition> samplePlanets() {
        return List.of(
                new PlanetPosition("Sun", "Aries", 10, 0, 0, false, 1, 10.0),
                new PlanetPosition("Moon", "Cancer", 17, 0, 0, false, 4, 107.0),
                new PlanetPosition("Mercury", "Gemini", 6, 0, 0, false, 3, 66.0),
                new PlanetPosition("Venus", "Taurus", 12, 0, 0, false, 7, 42.0),
                new PlanetPosition("Mars", "Leo", 23, 0, 0, false, 10, 143.0),
                new PlanetPosition("Saturn", "Aquarius", 5, 0, 0, false, 11, 305.0)
        );
    }

    private List<CrossAspect> sampleAspectsMixed() {
        return List.of(
                new CrossAspect("Venus", "Mars", "TRINE", "△", "Üçgen", 120.0, 1.2, true),
                new CrossAspect("Moon", "Saturn", "SQUARE", "□", "Kare", 90.0, 2.8, false),
                new CrossAspect("Mercury", "Jupiter", "SEXTILE", "✶", "Altmışlık", 60.0, 1.9, true),
                new CrossAspect("Sun", "Moon", "CONJUNCTION", "☌", "Kavuşum", 0.0, 2.1, true),
                new CrossAspect("Mars", "Pluto", "OPPOSITION", "☍", "Karşıt", 180.0, 1.5, false),
                new CrossAspect("Saturn", "Mercury", "TRINE", "△", "Üçgen", 120.0, 1.1, true)
        );
    }

    private List<CrossAspect> sampleAspectsSupportiveDense() {
        return List.of(
                new CrossAspect("Venus", "Mars", "TRINE", "△", "Üçgen", 120.0, 0.8, true),
                new CrossAspect("Moon", "Venus", "SEXTILE", "✶", "Altmışlık", 60.0, 1.1, true),
                new CrossAspect("Sun", "Moon", "CONJUNCTION", "☌", "Kavuşum", 0.0, 0.7, true),
                new CrossAspect("Mercury", "Saturn", "TRINE", "△", "Üçgen", 120.0, 0.9, true),
                new CrossAspect("Mars", "Jupiter", "SEXTILE", "✶", "Altmışlık", 60.0, 1.2, true),
                new CrossAspect("Saturn", "Sun", "TRINE", "△", "Üçgen", 120.0, 1.0, true),
                new CrossAspect("Moon", "Jupiter", "SEXTILE", "✶", "Altmışlık", 60.0, 0.9, true),
                new CrossAspect("Venus", "Moon", "TRINE", "△", "Üçgen", 120.0, 1.3, true)
        );
    }

    private List<CrossAspect> sampleAspectsChallenging() {
        return List.of(
                new CrossAspect("Mars", "Saturn", "SQUARE", "□", "Kare", 90.0, 1.1, false),
                new CrossAspect("Moon", "Pluto", "OPPOSITION", "☍", "Karşıt", 180.0, 0.9, false),
                new CrossAspect("Mercury", "Mars", "SQUARE", "□", "Kare", 90.0, 1.3, false),
                new CrossAspect("Sun", "Saturn", "OPPOSITION", "☍", "Karşıt", 180.0, 1.0, false),
                new CrossAspect("Venus", "Uranus", "SQUARE", "□", "Kare", 90.0, 1.4, false)
        );
    }

    private List<CrossAspect> sampleAspectsClustered() {
        return List.of(
                new CrossAspect("Sun", "Sun", "TRINE", "△", "Üçgen", 120.0, 1.5, true),
                new CrossAspect("Moon", "Moon", "SEXTILE", "✶", "Altmışlık", 60.0, 1.6, true),
                new CrossAspect("Mercury", "Mercury", "SEXTILE", "✶", "Altmışlık", 60.0, 1.5, true),
                new CrossAspect("Venus", "Venus", "TRINE", "△", "Üçgen", 120.0, 1.7, true),
                new CrossAspect("Mars", "Mars", "SEXTILE", "✶", "Altmışlık", 60.0, 1.4, true)
        );
    }

    private List<CrossAspect> sampleAspectsLoveHighWorkLow() {
        return List.of(
                new CrossAspect("Venus", "Mars", "TRINE", "△", "Üçgen", 120.0, 0.4, true),
                new CrossAspect("Moon", "Venus", "TRINE", "△", "Üçgen", 120.0, 0.6, true),
                new CrossAspect("Sun", "Moon", "CONJUNCTION", "☌", "Kavuşum", 0.0, 0.5, true),
                new CrossAspect("Venus", "Venus", "CONJUNCTION", "☌", "Kavuşum", 0.0, 0.4, true),
                new CrossAspect("Moon", "Moon", "TRINE", "△", "Üçgen", 120.0, 0.5, true),
                new CrossAspect("Sun", "Venus", "SEXTILE", "✶", "Altmışlık", 60.0, 0.8, true),
                new CrossAspect("Venus", "Neptune", "SEXTILE", "✶", "Altmışlık", 60.0, 0.9, true),
                new CrossAspect("Moon", "Jupiter", "TRINE", "△", "Üçgen", 120.0, 1.0, true),
                new CrossAspect("Venus", "Jupiter", "TRINE", "△", "Üçgen", 120.0, 0.7, true),
                new CrossAspect("Mercury", "Mars", "SQUARE", "□", "Kare", 90.0, 0.6, false),
                new CrossAspect("Mercury", "Saturn", "OPPOSITION", "☍", "Karşıt", 180.0, 0.8, false),
                new CrossAspect("Sun", "Mercury", "SQUARE", "□", "Kare", 90.0, 1.0, false),
                new CrossAspect("Mars", "Saturn", "SQUARE", "□", "Kare", 90.0, 0.7, false),
                new CrossAspect("Mercury", "Pluto", "SQUARE", "□", "Kare", 90.0, 1.1, false)
        );
    }
}
