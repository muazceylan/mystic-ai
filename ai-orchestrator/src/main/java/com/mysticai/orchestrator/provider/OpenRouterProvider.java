package com.mysticai.orchestrator.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * OpenRouter provider using OpenAI-compatible chat completions API.
 */
public class OpenRouterProvider implements AiModelProvider {

    private final String providerKey;
    private final String name;
    private final String model;
    private final Integer maxTokens;
    private final Double temperature;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public OpenRouterProvider(
            String providerKey,
            String name,
            String apiKey,
            String model,
            String baseUrl,
            int timeoutMs,
            Integer maxTokens,
            Double temperature,
            Map<String, String> headers,
            ObjectMapper objectMapper
    ) {
        this.providerKey = providerKey;
        this.name = name;
        this.model = model;
        this.maxTokens = maxTokens;
        this.temperature = temperature;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeoutMs);
        factory.setReadTimeout(timeoutMs);

        RestClient.Builder builder = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .defaultHeader("Accept", "application/json");

        if (apiKey != null && !apiKey.isBlank()) {
            builder.defaultHeader("Authorization", "Bearer " + apiKey);
        }

        if (headers != null) {
            headers.forEach(builder::defaultHeader);
        }

        this.restClient = builder.build();
    }

    @Override
    public String providerKey() {
        return providerKey;
    }

    @Override
    public String getName() {
        return name + "/" + model;
    }

    @Override
    public String modelId() {
        return model;
    }

    @Override
    public String generateResponse(String prompt) {
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", model);
            body.put("messages", List.of(Map.of("role", "user", "content", prompt)));
            if (maxTokens != null && maxTokens > 0) {
                body.put("max_tokens", maxTokens);
            }
            if (temperature != null) {
                body.put("temperature", temperature);
            }

            String raw = restClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(raw);
            return root.at("/choices/0/message/content").asText("");
        } catch (Exception e) {
            throw new RuntimeException("[" + providerKey + "] request failed: " + e.getMessage(), e);
        }
    }
}
