package com.mysticai.orchestrator.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.common.event.AiAnalysisEvent;
import com.mysticai.orchestrator.config.AiOrchestrationProperties;
import com.mysticai.orchestrator.prompt.MysticalPromptTemplates;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MysticalAiServiceTest {

    @Test
    void shouldUseComplexChainForEditorialTranslationAndNormalizeOutput() {
        RecordingFallbackService fallbackService =
                new RecordingFallbackService("```\nTranslation: Aries and Mercury worldsine\n```");
        MysticalAiService service = new MysticalAiService(fallbackService, null, new ObjectMapper());

        String result = service.generateEditorialHoroscopeTranslation(
                "Today brings clear momentum for your plans.",
                "aries",
                "daily",
                "tr"
        );

        assertTrue(fallbackService.lastComplex);
        assertTrue(result.contains("Koç"));
        assertTrue(result.contains("Merkür"));
        assertTrue(result.contains("dünyasına"));
        assertFalse(result.toLowerCase().contains("translation:"));
    }

    @Test
    void shouldBypassEditorialModelForNonTurkishLocale() {
        RecordingFallbackService fallbackService = new RecordingFallbackService("unused");
        MysticalAiService service = new MysticalAiService(fallbackService, null, new ObjectMapper());
        String source = "Today you can slow down and reorganize priorities.";

        String result = service.generateEditorialHoroscopeTranslation(source, "aries", "daily", "en");

        assertEquals(source, result);
        assertFalse(fallbackService.generateCalled);
    }

    @Test
    void shouldBuildDeterministicEnglishNatalJsonWhenAiOutputIsBroken() throws Exception {
        RecordingFallbackService fallbackService = new RecordingFallbackService(
                "chartId. 1. sunSign. Capricorn. moonSign. Leo. risingSign. Gemini. absoluteLongitude. 298.85."
        );
        MysticalAiService service = new MysticalAiService(
                fallbackService,
                new MysticalPromptTemplates(),
                new ObjectMapper()
        );

        String result = service.generateInterpretation(new AiAnalysisEvent(
                180L,
                natalPayload("en"),
                AiAnalysisEvent.SourceService.ASTROLOGY,
                AiAnalysisEvent.AnalysisType.NATAL_CHART
        ));

        ObjectMapper mapper = new ObjectMapper();
        var json = mapper.readTree(result);
        assertEquals("natal_v2", json.path("version").asText());
        assertTrue(json.path("opening").asText().contains("Capricorn"));
        assertTrue(json.path("sections").size() >= 6);
        assertTrue(json.path("planetHighlights").size() >= 5);
        assertFalse(result.contains("Temel yorum korunarak"));
        assertFalse(result.contains("Oğlak"));
    }

    @Test
    void shouldBuildDeterministicTurkishNatalJsonWhenAiOutputIsBroken() throws Exception {
        RecordingFallbackService fallbackService = new RecordingFallbackService(
                "chartId. 1. sunSign. Capricorn. moonSign. Leo. risingSign. Gemini. absoluteLongitude. 298.85."
        );
        MysticalAiService service = new MysticalAiService(
                fallbackService,
                new MysticalPromptTemplates(),
                new ObjectMapper()
        );

        String result = service.generateInterpretation(new AiAnalysisEvent(
                180L,
                natalPayload("tr"),
                AiAnalysisEvent.SourceService.ASTROLOGY,
                AiAnalysisEvent.AnalysisType.NATAL_CHART
        ));

        ObjectMapper mapper = new ObjectMapper();
        var json = mapper.readTree(result);
        assertEquals("natal_v2", json.path("version").asText());
        assertTrue(json.path("opening").asText().contains("Oğlak"));
        assertTrue(json.path("sections").size() >= 6);
        assertTrue(json.path("planetHighlights").size() >= 5);
        assertFalse(result.contains("Temel yorum korunarak"));
    }

    private String natalPayload(String locale) {
        return """
                {
                  "chartId": 1446,
                  "name": "Ceycey",
                  "sunSign": "Capricorn",
                  "moonSign": "Leo",
                  "risingSign": "Gemini",
                  "ascendantDegree": 1.56,
                  "planets": [
                    { "planet": "Sun", "sign": "Capricorn", "degree": 28.0, "minutes": 51, "seconds": 17, "retrograde": false, "house": 9, "absoluteLongitude": 298.85 },
                    { "planet": "Moon", "sign": "Leo", "degree": 29.0, "minutes": 5, "seconds": 53, "retrograde": false, "house": 4, "absoluteLongitude": 149.09 },
                    { "planet": "Mercury", "sign": "Aquarius", "degree": 17.0, "minutes": 35, "seconds": 0, "retrograde": false, "house": 10, "absoluteLongitude": 317.58 },
                    { "planet": "Venus", "sign": "Sagittarius", "degree": 12.0, "minutes": 5, "seconds": 57, "retrograde": false, "house": 7, "absoluteLongitude": 252.09 },
                    { "planet": "Mars", "sign": "Virgo", "degree": 0.0, "minutes": 51, "seconds": 46, "retrograde": true, "house": 4, "absoluteLongitude": 150.86 },
                    { "planet": "Pluto", "sign": "Sagittarius", "degree": 0.0, "minutes": 3, "seconds": 3, "retrograde": false, "house": 6, "absoluteLongitude": 240.05 },
                    { "planet": "NorthNode", "sign": "Scorpio", "degree": 11.0, "minutes": 11, "seconds": 45, "retrograde": false, "house": 6, "absoluteLongitude": 221.19 }
                  ],
                  "houses": [
                    { "houseNumber": 7, "sign": "Sagittarius", "degree": 1.56, "ruler": "Jupiter" },
                    { "houseNumber": 10, "sign": "Aquarius", "degree": 8.95, "ruler": "Uranus" }
                  ],
                  "aspects": [
                    { "planet1": "Sun", "planet2": "Uranus", "type": "CONJUNCTION", "angle": 2.3, "orb": 2.3 },
                    { "planet1": "Moon", "planet2": "Pluto", "type": "SQUARE", "angle": 90.95, "orb": 0.95 }
                  ],
                  "currentTransitSummary": [],
                  "locale": "%s"
                }
                """.formatted(locale);
    }

    private static final class RecordingFallbackService extends AiFallbackService {
        private final String response;
        private boolean generateCalled;
        private boolean lastComplex;

        private RecordingFallbackService(String response) {
            super(
                    List.of(),
                    new AiOrchestrationProperties(),
                    new FailureClassifier(),
                    new ProviderStateManager(),
                    new MockInterpretationService()
            );
            this.response = response;
        }

        @Override
        public String generate(String prompt, boolean complex) {
            this.generateCalled = true;
            this.lastComplex = complex;
            return response;
        }
    }
}
