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
 * Groq-hosted LLM provider using the OpenAI-compatible chat completions API.
 * Each instance wraps a specific model (e.g. llama-3.3-70b, mixtral-8x7b, llama-3.1-8b).
 */
public class GroqProvider implements AiModelProvider {

    private static final Logger log = LoggerFactory.getLogger(GroqProvider.class);

    private final String name;
    private final String model;
    private final int maxTokens;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GroqProvider(String name, String apiKey, String model,
                        String baseUrl, int maxTokens, ObjectMapper objectMapper) {
        this.name = name;
        this.model = model;
        this.maxTokens = maxTokens;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(8_000);
        factory.setReadTimeout(55_000);  // large models can take up to 50s

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Accept", "application/json")
                .build();
    }

    @Override
    public String getName() { return name; }

    @Override
    public String generateResponse(String prompt) {
        try {
            Map<String, Object> body = Map.of(
                    "model", model,
                    "messages", List.of(Map.of("role", "user", "content", prompt)),
                    "max_tokens", maxTokens,
                    "temperature", 0.8
            );

            String raw = restClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(raw);
            String content = root.at("/choices/0/message/content").asText();
            if (content.isBlank()) {
                throw new RuntimeException("Empty content in response from " + name);
            }
            log.debug("[{}] Response received ({} chars)", name, content.length());
            return content;

        } catch (Exception e) {
            throw new RuntimeException("[" + name + "] failed: " + e.getMessage(), e);
        }
    }
}
