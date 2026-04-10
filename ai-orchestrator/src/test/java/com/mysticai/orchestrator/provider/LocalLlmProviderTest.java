package com.mysticai.orchestrator.provider;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class LocalLlmProviderTest {

    @Test
    void shouldParseOllamaResponseWhenPayloadArrivesAsBytes() throws Exception {
        LocalLlmProvider provider = new LocalLlmProvider(
                "localLlm",
                "ollama",
                "gemma3:4b",
                "http://127.0.0.1:11434",
                "/api/generate",
                5000,
                0.7,
                1024,
                Map.of(),
                new ObjectMapper()
        );

        String result = provider.extractResponse("{\"response\":\"pong from gemma\"}".getBytes(StandardCharsets.UTF_8));

        assertEquals("pong from gemma", result);
    }
}
