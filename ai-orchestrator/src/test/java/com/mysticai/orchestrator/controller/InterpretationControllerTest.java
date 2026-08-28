package com.mysticai.orchestrator.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.orchestrator.service.MysticalAiService;
import com.mysticai.orchestrator.dto.DreamExpansionRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.test.util.ReflectionTestUtils;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class InterpretationControllerTest {

    private StubMysticalAiService mysticalAiService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mysticalAiService = new StubMysticalAiService();
        InterpretationController controller =
                new InterpretationController(mysticalAiService, new com.fasterxml.jackson.databind.ObjectMapper());
        ReflectionTestUtils.setField(controller, "internalGatewayKey", "test-internal-key");
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void shouldUseSimpleChainForPlainTextRequests() throws Exception {
        mockMvc.perform(post("/api/ai/horoscope/fuse")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "systemPrompt": "system",
                                  "userPrompt": "user",
                                  "expectJsonResponse": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Merhaba dunya")));

        assertTrue(mysticalAiService.simpleCalled);
        assertFalse(mysticalAiService.fusionCalled);
        assertEquals("system", mysticalAiService.lastSystemPrompt);
        assertEquals("user", mysticalAiService.lastUserPrompt);
    }

    @Test
    void shouldUseFusionChainForJsonRequests() throws Exception {
        mockMvc.perform(post("/api/ai/horoscope/fuse")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "systemPrompt": "system",
                                  "userPrompt": "user"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(content().string("{\"ok\":true}"));

        assertTrue(mysticalAiService.fusionCalled);
        assertFalse(mysticalAiService.simpleCalled);
        assertEquals("system", mysticalAiService.lastSystemPrompt);
        assertEquals("user", mysticalAiService.lastUserPrompt);
    }

    @Test
    void shouldUseEditorialTranslationEndpoint() throws Exception {
        mockMvc.perform(post("/api/ai/horoscope/translate-editorial")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "sourceText": "Today you should pace yourself.",
                                  "sign": "aries",
                                  "period": "daily",
                                  "locale": "tr"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Editoryal Türkçe metin")));

        assertTrue(mysticalAiService.editorialCalled);
        assertEquals("Today you should pace yourself.", mysticalAiService.lastSourceText);
        assertEquals("aries", mysticalAiService.lastSign);
        assertEquals("daily", mysticalAiService.lastPeriod);
        assertEquals("tr", mysticalAiService.lastLocale);
    }

    @Test
    void dreamExpansionRejectsRequestsWithoutInternalServiceKey() throws Exception {
        mockMvc.perform(post("/api/ai/dream/expand")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "expansionType": "EMOTIONAL_ANALYSIS",
                                  "dreamText": "I walked beside the sea."
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void dreamExpansionReturnsOnlyRealStructuredAiResult() throws Exception {
        mockMvc.perform(post("/api/ai/dream/expand")
                        .header("X-Internal-Service-Key", "test-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "expansionType": "EMOTIONAL_ANALYSIS",
                                  "dreamText": "I walked beside the sea.",
                                  "locale": "en"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        {
                          "title": "Emotional layer",
                          "summary": "A grounded summary of the supplied dream.",
                          "insights": ["One", "Two"],
                          "reflectionPrompt": "What stayed with you?"
                        }
                        """));
        assertTrue(mysticalAiService.dreamExpansionCalled);
    }

    private static final class StubMysticalAiService extends MysticalAiService {

        private boolean simpleCalled;
        private boolean fusionCalled;
        private boolean editorialCalled;
        private boolean dreamExpansionCalled;
        private String lastSystemPrompt;
        private String lastUserPrompt;
        private String lastSourceText;
        private String lastSign;
        private String lastPeriod;
        private String lastLocale;

        private StubMysticalAiService() {
            super(null, null, new ObjectMapper());
        }

        @Override
        public String generateSimpleText(String systemPrompt, String userPrompt) {
            simpleCalled = true;
            lastSystemPrompt = systemPrompt;
            lastUserPrompt = userPrompt;
            return "Merhaba dunya";
        }

        @Override
        public String fuseHoroscope(String systemPrompt, String userPrompt) {
            fusionCalled = true;
            lastSystemPrompt = systemPrompt;
            lastUserPrompt = userPrompt;
            return "{\"ok\":true}";
        }

        @Override
        public String generateEditorialHoroscopeTranslation(String sourceText, String sign, String period, String locale) {
            editorialCalled = true;
            lastSourceText = sourceText;
            lastSign = sign;
            lastPeriod = period;
            lastLocale = locale;
            return "Editoryal Türkçe metin";
        }

        @Override
        public String generateDreamExpansion(DreamExpansionRequest request) {
            dreamExpansionCalled = true;
            return """
                    {
                      "title": "Emotional layer",
                      "summary": "A grounded summary of the supplied dream.",
                      "insights": ["One", "Two"],
                      "reflectionPrompt": "What stayed with you?"
                    }
                    """;
        }
    }
}
