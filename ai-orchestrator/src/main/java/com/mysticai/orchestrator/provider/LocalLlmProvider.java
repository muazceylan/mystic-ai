package com.mysticai.orchestrator.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Local LLM provider (default: Ollama).
 */
public class LocalLlmProvider implements AiModelProvider {

    private final String providerKey;
    private final String providerType;
    private final String model;
    private final String chatEndpoint;
    private final Double temperature;
    private final Integer maxOutputTokens;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public LocalLlmProvider(
            String providerKey,
            String providerType,
            String model,
            String baseUrl,
            String chatEndpoint,
            int timeoutMs,
            Double temperature,
            Integer maxOutputTokens,
            Map<String, String> headers,
            ObjectMapper objectMapper
    ) {
        this.providerKey = providerKey;
        this.providerType = providerType;
        this.model = model;
        this.chatEndpoint = chatEndpoint;
        this.temperature = temperature;
        this.maxOutputTokens = maxOutputTokens;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeoutMs);
        factory.setReadTimeout(timeoutMs);

        RestClient.Builder builder = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .defaultHeader("Accept", "application/json");

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
        return "LocalLlm/" + providerType + "/" + model;
    }

    @Override
    public String modelId() {
        return model;
    }

    @Override
    public String generateResponse(String prompt) {
        try {
            if (!"ollama".equalsIgnoreCase(providerType)) {
                throw new RuntimeException("Unsupported local provider-type: " + providerType);
            }

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", model);
            body.put("prompt", prompt);
            body.put("stream", false);

            Map<String, Object> options = new LinkedHashMap<>();
            if (temperature != null) {
                options.put("temperature", temperature);
            }
            if (maxOutputTokens != null && maxOutputTokens > 0) {
                options.put("num_predict", maxOutputTokens);
            }
            if (!options.isEmpty()) {
                body.put("options", options);
            }

            byte[] rawBytes = restClient.post()
                    .uri(chatEndpoint)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(byte[].class);

            return extractResponse(rawBytes);
        } catch (Exception e) {
            throw new RuntimeException("[" + providerKey + "] request failed: " + e.getMessage(), e);
        }
    }

    String extractResponse(byte[] rawBytes) throws Exception {
        if (rawBytes == null || rawBytes.length == 0) {
            return "";
        }

        String raw = new String(rawBytes, StandardCharsets.UTF_8);
        JsonNode root = objectMapper.readTree(raw);
        return root.path("response").asText("");
    }
}
