package com.mysticai.orchestrator.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Google Gemini provider using the Generative Language REST API (free tier).
 * Uses gemini-1.5-flash which has high RPM — ideal fallback when Groq rate-limits.
 * Silently skips itself (throws) if no API key is configured.
 */
public class GeminiProvider implements AiModelProvider {

    private static final Logger log = LoggerFactory.getLogger(GeminiProvider.class);

    private final String name;
    private final String apiKey;
    private final String model;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiProvider(String name, String apiKey, String model,
                          String baseUrl, ObjectMapper objectMapper) {
        this.name = name;
        this.apiKey = apiKey;
        this.model = model;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(8_000);
        factory.setReadTimeout(55_000);

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .build();
    }

    @Override
    public String getName() { return name; }

    @Override
    public String generateResponse(String prompt) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new RuntimeException("[" + name + "] Gemini API key not configured — skipping");
        }
        try {
            Map<String, Object> body = Map.of(
                    "contents", List.of(Map.of(
                            "role", "user",
                            "parts", List.of(Map.of("text", prompt))
                    )),
                    "generationConfig", Map.of(
                            "maxOutputTokens", 2048,
                            "temperature", 0.8
                    )
            );

            String raw = restClient.post()
                    .uri("/models/{model}:generateContent?key={key}", model, apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(raw);

            // Gemini may block content for safety
            String finishReason = root.at("/candidates/0/finishReason").asText("");
            if ("SAFETY".equals(finishReason) || "RECITATION".equals(finishReason)) {
                throw new RuntimeException("[" + name + "] response blocked: " + finishReason);
            }

            String content = root.at("/candidates/0/content/parts/0/text").asText();
            if (content.isBlank()) {
                throw new RuntimeException("[" + name + "] empty content in response");
            }
            log.debug("[{}] Response received ({} chars)", name, content.length());
            return content;

        } catch (Exception e) {
            throw new RuntimeException("[" + name + "] failed: " + e.getMessage(), e);
        }
    }
}
