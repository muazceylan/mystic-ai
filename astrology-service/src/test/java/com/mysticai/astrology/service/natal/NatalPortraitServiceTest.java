package com.mysticai.astrology.service.natal;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.dto.natal.NatalPortrait;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.entity.NatalPortraitCache;
import com.mysticai.astrology.repository.NatalChartRepository;
import com.mysticai.astrology.repository.NatalPortraitCacheRepository;
import com.mysticai.astrology.service.NatalChartCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Covers the parts of the pipeline that decide what a user actually sees: whether a cached
 * portrait is reused, whether a rejected generation is retried with the reason attached, and
 * whether a persistent failure degrades to the deterministic path instead of an error.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class NatalPortraitServiceTest {

    @Mock private NatalChartRepository natalChartRepository;
    @Mock private NatalPortraitCacheRepository portraitRepository;
    @Mock private NatalPortraitAiClient aiClient;

    private ObjectMapper objectMapper;
    private NatalPortraitService service;
    private NatalPortraitFallbackComposer fallbackComposer;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        NatalChartNormalizer normalizer = new NatalChartNormalizer(new NatalChartCalculator(null));
        NatalPortraitValidator validator = new NatalPortraitValidator();
        NatalPortraitSanitizer sanitizer = new NatalPortraitSanitizer();
        fallbackComposer = new NatalPortraitFallbackComposer(new NatalVocabulary());

        service = new NatalPortraitService(
                natalChartRepository, portraitRepository, normalizer,
                aiClient, validator, sanitizer, fallbackComposer, objectMapper);

        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(Optional.of(storedChart()));
        when(portraitRepository.save(any(NatalPortraitCache.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("serves a cached portrait without calling the model")
    void servesFromCache() throws Exception {
        NatalPortrait cached = fallbackComposer.compose(
                service.getNormalizedChart("42", "tr"), "tr");
        when(portraitRepository.findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                eq("42"), anyString(), eq(NatalPortraitService.CONTRACT_VERSION), eq("tr")))
                .thenReturn(Optional.of(cacheRow(objectMapper.writeValueAsString(cached))));

        NatalPortraitService.PortraitResult result = service.getPortrait("42", "tr", false);

        assertTrue(result.fromCache());
        assertNotNull(result.portrait());
        verifyNoInteractions(aiClient);
    }

    @Test
    @DisplayName("regenerate ignores the cache and calls the model again")
    void regenerateBypassesCache() throws Exception {
        NatalPortrait cached = fallbackComposer.compose(
                service.getNormalizedChart("42", "tr"), "tr");
        when(portraitRepository.findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                any(), any(), any(), any()))
                .thenReturn(Optional.of(cacheRow(objectMapper.writeValueAsString(cached))));
        when(aiClient.generatePortrait(any(), eq("tr"), isNull()))
                .thenReturn(objectMapper.writeValueAsString(cached));

        NatalPortraitService.PortraitResult result = service.getPortrait("42", "tr", true);

        assertFalse(result.fromCache());
        verify(aiClient).generatePortrait(any(), eq("tr"), isNull());
    }

    @Test
    @DisplayName("caches per locale, so switching language regenerates")
    void cachesPerLocale() throws Exception {
        NatalPortrait trPortrait = fallbackComposer.compose(
                service.getNormalizedChart("42", "tr"), "tr");
        when(portraitRepository.findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                eq("42"), anyString(), anyString(), eq("tr")))
                .thenReturn(Optional.of(cacheRow(objectMapper.writeValueAsString(trPortrait))));
        when(portraitRepository.findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                eq("42"), anyString(), anyString(), eq("en")))
                .thenReturn(Optional.empty());
        when(aiClient.generatePortrait(any(), eq("en"), any()))
                .thenThrow(new IllegalStateException("provider down"));

        assertTrue(service.getPortrait("42", "tr", false).fromCache());
        assertFalse(service.getPortrait("42", "en", false).fromCache());
    }

    @Test
    @DisplayName("retries once with the validator's complaint attached, then accepts the fix")
    void retriesWithCorrectionContext() throws Exception {
        String hallucinated = objectMapper.writeValueAsString(
                portraitWithHallucinatedSun());
        String corrected = objectMapper.writeValueAsString(
                fallbackComposer.compose(service.getNormalizedChart("42", "tr"), "tr"));

        when(portraitRepository.findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                any(), any(), any(), any())).thenReturn(Optional.empty());
        when(aiClient.generatePortrait(any(), eq("tr"), isNull())).thenReturn(hallucinated);
        when(aiClient.generatePortrait(any(), eq("tr"), argThat(c -> c != null && !c.isBlank())))
                .thenReturn(corrected);

        NatalPortraitService.PortraitResult result = service.getPortrait("42", "tr", false);

        ArgumentCaptor<String> correction = ArgumentCaptor.forClass(String.class);
        verify(aiClient, times(2)).generatePortrait(any(), eq("tr"), correction.capture());

        String retryCorrection = correction.getAllValues().get(1);
        assertNotNull(retryCorrection);
        assertTrue(retryCorrection.contains("hallucinated"),
                "the retry must tell the model what was wrong: " + retryCorrection);
        assertEquals("AI", result.portrait().source());
    }

    @Test
    @DisplayName("falls back to the deterministic portrait after two rejections")
    void fallsBackAfterTwoRejections() throws Exception {
        String hallucinated = objectMapper.writeValueAsString(portraitWithHallucinatedSun());
        when(portraitRepository.findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                any(), any(), any(), any())).thenReturn(Optional.empty());
        when(aiClient.generatePortrait(any(), any(), any())).thenReturn(hallucinated);

        NatalPortraitService.PortraitResult result = service.getPortrait("42", "tr", false);

        verify(aiClient, times(2)).generatePortrait(any(), any(), any());
        assertEquals("FALLBACK", result.portrait().source());
        assertFalse(result.portrait().aboutMe().isEmpty());
    }

    @Test
    @DisplayName("falls back when the provider is unavailable")
    void fallsBackWhenProviderThrows() {
        when(portraitRepository.findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                any(), any(), any(), any())).thenReturn(Optional.empty());
        when(aiClient.generatePortrait(any(), any(), any()))
                .thenThrow(new IllegalStateException("timeout"));

        NatalPortraitService.PortraitResult result = service.getPortrait("42", "tr", false);

        assertEquals("FALLBACK", result.portrait().source());
    }

    @Test
    @DisplayName("falls back when the provider returns malformed JSON")
    void fallsBackOnMalformedJson() {
        when(portraitRepository.findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                any(), any(), any(), any())).thenReturn(Optional.empty());
        when(aiClient.generatePortrait(any(), any(), any())).thenReturn("not json at all {{{");

        NatalPortraitService.PortraitResult result = service.getPortrait("42", "tr", false);

        assertEquals("FALLBACK", result.portrait().source());
    }

    @Test
    @DisplayName("strips a markdown code fence the provider wrapped the JSON in")
    void stripsCodeFence() throws Exception {
        String body = objectMapper.writeValueAsString(
                fallbackComposer.compose(service.getNormalizedChart("42", "tr"), "tr"));
        when(portraitRepository.findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                any(), any(), any(), any())).thenReturn(Optional.empty());
        when(aiClient.generatePortrait(any(), any(), any()))
                .thenReturn("```json\n" + body + "\n```");

        NatalPortraitService.PortraitResult result = service.getPortrait("42", "tr", false);

        assertEquals("AI", result.portrait().source());
    }

    @Test
    @DisplayName("persists a generated portrait under the chart's own signature")
    void persistsGeneratedPortrait() throws Exception {
        String body = objectMapper.writeValueAsString(
                fallbackComposer.compose(service.getNormalizedChart("42", "tr"), "tr"));
        when(portraitRepository.findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                any(), any(), any(), any())).thenReturn(Optional.empty());
        when(aiClient.generatePortrait(any(), any(), any())).thenReturn(body);

        service.getPortrait("42", "tr", false);

        ArgumentCaptor<NatalPortraitCache> saved = ArgumentCaptor.forClass(NatalPortraitCache.class);
        verify(portraitRepository).save(saved.capture());
        NatalPortraitCache row = saved.getValue();
        assertEquals("42", row.getUserId());
        assertEquals("READY", row.getStatus());
        assertEquals(NatalPortraitService.CONTRACT_VERSION, row.getInterpretationVersion());
        assertEquals("tr", row.getLocale());
        assertNotNull(row.getChartSignature());
        assertEquals(7L, row.getChartId());
    }

    @Test
    @DisplayName("a corrected birth time produces a different cache key")
    void birthDataChangeInvalidatesCache() {
        when(portraitRepository.findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                any(), any(), any(), any())).thenReturn(Optional.empty());
        when(aiClient.generatePortrait(any(), any(), any()))
                .thenThrow(new IllegalStateException("offline"));

        service.getPortrait("42", "tr", false);
        ArgumentCaptor<String> first = ArgumentCaptor.forClass(String.class);
        // Looked up twice per call: once to read the cache, once to upsert it.
        verify(portraitRepository, atLeastOnce())
                .findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                        any(), first.capture(), any(), any());

        NatalChart corrected = storedChart();
        corrected.setBirthTime(LocalTime.of(9, 15));
        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDescIdDesc("42"))
                .thenReturn(Optional.of(corrected));
        reset(portraitRepository);
        when(portraitRepository.findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                any(), any(), any(), any())).thenReturn(Optional.empty());
        when(portraitRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.getPortrait("42", "tr", false);
        ArgumentCaptor<String> second = ArgumentCaptor.forClass(String.class);
        verify(portraitRepository, atLeastOnce())
                .findByUserIdAndChartSignatureAndInterpretationVersionAndLocale(
                        any(), second.capture(), any(), any());

        assertNotEquals(first.getValue(), second.getValue(),
                "changing the birth time must change the cache key");
    }

    @Test
    @DisplayName("a user with no chart is a not-found condition, not a crash")
    void missingChartThrowsIllegalState() {
        when(natalChartRepository.findFirstByUserIdOrderByCalculatedAtDescIdDesc("99"))
                .thenReturn(Optional.empty());

        assertThrows(IllegalStateException.class, () -> service.getPortrait("99", "tr", false));
    }

    @Test
    @DisplayName("an unanswerable question returns a plain refusal rather than an invented answer")
    void askDegradesWithoutInventingAnAnswer() {
        when(aiClient.askChart(any(), any(), any()))
                .thenThrow(new IllegalStateException("provider down"));

        NatalPortraitService.AskResult result = service.ask("42", "tr", "Ne zaman evleneceğim?");

        assertFalse(result.answerable());
        assertTrue(result.evidence().isEmpty());
        assertFalse(result.answer().isBlank());
    }

    @Test
    @DisplayName("an answer citing a placement the chart does not have loses its evidence, not its answer")
    void askDropsHallucinatedEvidence() {
        when(aiClient.askChart(any(), any(), any())).thenReturn("""
                {
                  "answer": "Duygularını analiz etmeye yatkınsın.",
                  "answerable": true,
                  "evidence": [
                    {"type":"PLACEMENT","label":"Ay Koç","planet":"Moon","sign":"Aries"}
                  ]
                }
                """);

        NatalPortraitService.AskResult result = service.ask("42", "tr", "Neden analiz ediyorum?");

        assertTrue(result.answerable());
        assertEquals("Duygularını analiz etmeye yatkınsın.", result.answer());
        assertTrue(result.evidence().isEmpty(), "a hallucinated receipt must be dropped");
    }

    @Test
    @DisplayName("keeps evidence that matches the chart")
    void askKeepsValidEvidence() {
        when(aiClient.askChart(any(), any(), any())).thenReturn("""
                {
                  "answer": "Ay'ın Başak'ta olduğu için detayları fark ediyorsun.",
                  "answerable": true,
                  "evidence": [
                    {"type":"PLACEMENT","label":"Ay Başak · 1. Ev","planet":"Moon","sign":"Virgo","house":1}
                  ]
                }
                """);

        NatalPortraitService.AskResult result = service.ask("42", "tr", "Neden detay fark ediyorum?");

        assertTrue(result.answerable());
        assertEquals(1, result.evidence().size());
        assertEquals("Moon", result.evidence().get(0).planet());
    }

    // ------------------------------------------------------------------ fixtures

    private NatalChart storedChart() {
        try {
            NatalChart chart = new NatalChart();
            chart.setId(7L);
            chart.setUserId("42");
            chart.setBirthDate(LocalDate.of(1990, 3, 7));
            chart.setBirthTime(LocalTime.of(8, 30));
            chart.setBirthLocation("Istanbul, Turkey");
            chart.setLatitude(41.0082);
            chart.setLongitude(28.9784);
            chart.setSunSign("Pisces");
            chart.setMoonSign("Virgo");
            chart.setRisingSign("Leo");
            chart.setAscendantDegree(16.0);
            chart.setPlanetPositionsJson(
                    objectMapper.writeValueAsString(NatalChartTestFixtures.richChartPlanets()));
            chart.setHousePlacementsJson(
                    objectMapper.writeValueAsString(NatalChartTestFixtures.leoRisingHouses()));
            chart.setAspectsJson(
                    objectMapper.writeValueAsString(NatalChartTestFixtures.richAspects()));
            return chart;
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private NatalPortraitCache cacheRow(String json) {
        return NatalPortraitCache.builder()
                .userId("42")
                .chartId(7L)
                .chartSignature("sig")
                .interpretationVersion(NatalPortraitService.CONTRACT_VERSION)
                .locale("tr")
                .status("READY")
                .source("AI")
                .portraitJson(json)
                .build();
    }

    /** A response that claims the Sun is in Leo when the chart has it in Pisces. */
    private NatalPortrait portraitWithHallucinatedSun() {
        NatalPortrait base = fallbackComposer.compose(service.getNormalizedChart("42", "tr"), "tr");
        return new NatalPortrait(base.version(), base.locale(), "AI",
                new NatalPortrait.Portrait(
                        base.portrait().headline(), base.portrait().summary(), base.portrait().traits(),
                        List.of(new NatalPortrait.Evidence(
                                "PLACEMENT", "Güneş Aslan", "Sun", "Leo", null, null, null))),
                base.bigThree(), base.aboutMe(), base.lifeAreas(),
                base.planetReadings(), base.houseReadings(), base.aspectStory());
    }
}
