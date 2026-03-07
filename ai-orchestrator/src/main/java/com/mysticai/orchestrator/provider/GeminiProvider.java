package com.mysticai.orchestrator.provider;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.orchestrator.service.AiFailureType;
import com.mysticai.orchestrator.service.ProviderCallException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Google Gemini provider using generateContent API.
 */
public class GeminiProvider implements AiModelProvider {

    private static final Logger log = LoggerFactory.getLogger(GeminiProvider.class);
    private static final int RAW_SNIPPET_LIMIT = 500;

    private final String providerKey;
    private final String name;
    private final String apiKey;
    private final String model;
    private final Integer maxOutputTokens;
    private final Double temperature;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiProvider(
            String providerKey,
            String name,
            String apiKey,
            String model,
            String baseUrl,
            int timeoutMs,
            Integer maxOutputTokens,
            Double temperature,
            Map<String, String> headers,
            ObjectMapper objectMapper
    ) {
        this.providerKey = providerKey;
        this.name = name;
        this.apiKey = apiKey;
        this.model = model;
        this.maxOutputTokens = maxOutputTokens;
        this.temperature = temperature;
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
        return name + "/" + model;
    }

    @Override
    public String modelId() {
        return model;
    }

    @Override
    public String generateResponse(String prompt) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ProviderCallException(
                    "[" + providerKey + "] Gemini API key is missing",
                    AiFailureType.AUTH_ERROR,
                    null,
                    null,
                    null,
                    null
            );
        }

        Map<String, Object> body = buildRequestBody(prompt);

        try {
            ResponseEntity<byte[]> response = restClient.post()
                    .uri("/models/{model}:generateContent?key={key}", model, apiKey)
                    .accept(MediaType.APPLICATION_JSON)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toEntity(byte[].class);

            Integer statusCode = response.getStatusCode().value();
            String contentType = response.getHeaders().getContentType() != null
                    ? response.getHeaders().getContentType().toString()
                    : null;
            String raw = bytesToString(response.getBody());

            if (raw.isBlank()) {
                throw new ProviderCallException(
                        "[" + providerKey + "] empty response body",
                        AiFailureType.EMPTY_RESPONSE,
                        statusCode,
                        contentType,
                        null,
                        null
                );
            }

            JsonNode root = parseJson(raw, statusCode, contentType);
            String finishReason = root.at("/candidates/0/finishReason").asText("");
            if ("SAFETY".equalsIgnoreCase(finishReason) || "RECITATION".equalsIgnoreCase(finishReason)) {
                throw new ProviderCallException(
                        "[" + providerKey + "] blocked response: " + finishReason,
                        AiFailureType.BAD_REQUEST,
                        statusCode,
                        contentType,
                        snippet(raw),
                        null
                );
            }

            String content = extractContent(root);
            if (content.isBlank()) {
                if (log.isDebugEnabled()) {
                    log.debug("[{}] empty Gemini content statusCode={} contentType={} rawSnippet={}",
                            providerKey, statusCode, contentType, snippet(raw));
                }
                throw new ProviderCallException(
                        "[" + providerKey + "] empty content in Gemini response",
                        AiFailureType.EMPTY_RESPONSE,
                        statusCode,
                        contentType,
                        snippet(raw),
                        null
                );
            }

            return content;
        } catch (ProviderCallException ex) {
            logFailure(ex);
            throw ex;
        } catch (RestClientResponseException ex) {
            throw new ProviderCallException(
                    "[" + providerKey + "] Gemini HTTP call failed: " + ex.getMessage(),
                    AiFailureType.UNKNOWN,
                    ex.getStatusCode().value(),
                    ex.getResponseHeaders() != null && ex.getResponseHeaders().getContentType() != null
                            ? ex.getResponseHeaders().getContentType().toString()
                            : null,
                    snippet(ex.getResponseBodyAsString()),
                    ex
            );
        } catch (Exception ex) {
            throw new ProviderCallException(
                    "[" + providerKey + "] Gemini request failed: " + ex.getMessage(),
                    AiFailureType.UNKNOWN,
                    null,
                    null,
                    null,
                    ex
            );
        }
    }

    private Map<String, Object> buildRequestBody(String prompt) {
        Map<String, Object> generationConfig = new LinkedHashMap<>();
        if (maxOutputTokens != null && maxOutputTokens > 0) {
            generationConfig.put("maxOutputTokens", maxOutputTokens);
        }
        if (temperature != null) {
            generationConfig.put("temperature", temperature);
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("contents", List.of(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", prompt))
        )));
        if (!generationConfig.isEmpty()) {
            body.put("generationConfig", generationConfig);
        }
        return body;
    }

    private JsonNode parseJson(String raw, Integer statusCode, String contentType) {
        try {
            return objectMapper.readTree(raw);
        } catch (JsonProcessingException ex) {
            throw new ProviderCallException(
                    "[" + providerKey + "] JSON parse failed for Gemini response",
                    AiFailureType.RESPONSE_PARSE_ERROR,
                    statusCode,
                    contentType,
                    snippet(raw),
                    ex
            );
        }
    }

    private String extractContent(JsonNode root) {
        JsonNode parts = root.at("/candidates/0/content/parts");
        if (!parts.isArray() || parts.isEmpty()) {
            return "";
        }

        StringBuilder combined = new StringBuilder();
        for (JsonNode part : parts) {
            if (part.isTextual()) {
                combined.append(part.asText());
                continue;
            }
            String text = part.path("text").asText("");
            if (!text.isBlank()) {
                combined.append(text);
            }
        }

        return combined.toString().trim();
    }

    private void logFailure(ProviderCallException ex) {
        log.warn("[{}] Gemini failure type={} statusCode={} contentType={} rawSnippet={} message={}",
                providerKey,
                ex.getFailureType(),
                ex.getStatusCode(),
                ex.getContentType(),
                ex.getRawSnippet(),
                ex.getMessage());
    }

    private String bytesToString(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return "";
        }
        return new String(bytes, StandardCharsets.UTF_8);
    }

    private String snippet(String value) {
        if (value == null) {
            return null;
        }
        String singleLine = value.replaceAll("\\s+", " ").trim();
        if (singleLine.length() <= RAW_SNIPPET_LIMIT) {
            return singleLine;
        }
        return singleLine.substring(0, RAW_SNIPPET_LIMIT);
    }
}
