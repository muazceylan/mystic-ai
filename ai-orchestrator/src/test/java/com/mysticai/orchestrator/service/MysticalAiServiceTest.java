package com.mysticai.orchestrator.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.orchestrator.config.AiOrchestrationProperties;
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
