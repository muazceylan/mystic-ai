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
 * Groq-hosted LLM provider using OpenAI-compatible chat completions.
 */
public class GroqProvider implements AiModelProvider {

    private static final Logger log = LoggerFactory.getLogger(GroqProvider.class);
    private static final int RAW_SNIPPET_LIMIT = 500;

    private final String providerKey;
    private final String name;
    private final String model;
    private final Integer maxTokens;
    private final Double temperature;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GroqProvider(
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
        Map<String, Object> body = buildRequestBody(prompt);

        try {
            ResponseEntity<byte[]> response = restClient.post()
                    .uri("/chat/completions")
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
            String content = extractContent(root).trim();
            if (content.isBlank()) {
                if (log.isDebugEnabled()) {
                    log.debug("[{}] empty Groq content statusCode={} contentType={} rawSnippet={}",
                            providerKey, statusCode, contentType, snippet(raw));
                }
                throw new ProviderCallException(
                        "[" + providerKey + "] empty content in Groq response",
                        AiFailureType.EMPTY_RESPONSE,
                        statusCode,
                        contentType,
                        snippet(raw),
                        null
                );
            }

            return content;
        } catch (ProviderCallException ex) {
            throw ex;
        } catch (RestClientResponseException ex) {
            throw new ProviderCallException(
                    "[" + providerKey + "] Groq HTTP call failed: " + ex.getMessage(),
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
                    "[" + providerKey + "] Groq request failed: " + ex.getMessage(),
                    AiFailureType.UNKNOWN,
                    null,
                    null,
                    null,
                    ex
            );
        }
    }

    private Map<String, Object> buildRequestBody(String prompt) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", List.of(Map.of("role", "user", "content", prompt)));
        if (maxTokens != null && maxTokens > 0) {
            body.put("max_tokens", maxTokens);
        }
        if (temperature != null) {
            body.put("temperature", temperature);
        }
        return body;
    }

    private JsonNode parseJson(String raw, Integer statusCode, String contentType) {
        try {
            return objectMapper.readTree(raw);
        } catch (JsonProcessingException ex) {
            throw new ProviderCallException(
                    "[" + providerKey + "] JSON parse failed for Groq response",
                    AiFailureType.RESPONSE_PARSE_ERROR,
                    statusCode,
                    contentType,
                    snippet(raw),
                    ex
            );
        }
    }

    private String extractContent(JsonNode root) {
        JsonNode choice = root.path("choices").path(0);
        if (choice.isMissingNode() || choice.isNull()) {
            return "";
        }

        String fromMessageContent = extractFromMessageContent(choice.path("message").path("content"));
        if (!fromMessageContent.isBlank()) {
            return fromMessageContent;
        }

        String fromChoiceText = choice.path("text").asText("").trim();
        if (!fromChoiceText.isBlank()) {
            return fromChoiceText;
        }

        String fromDelta = extractFromMessageContent(choice.path("delta").path("content"));
        if (!fromDelta.isBlank()) {
            return fromDelta;
        }

        return "";
    }

    private String extractFromMessageContent(JsonNode contentNode) {
        if (contentNode == null || contentNode.isMissingNode() || contentNode.isNull()) {
            return "";
        }

        if (contentNode.isTextual()) {
            return contentNode.asText("").trim();
        }

        if (contentNode.isArray()) {
            StringBuilder sb = new StringBuilder();
            for (JsonNode item : contentNode) {
                if (item.isTextual()) {
                    sb.append(item.asText());
                    continue;
                }
                String text = item.path("text").asText("");
                if (!text.isBlank()) {
                    sb.append(text);
                }
            }
            return sb.toString().trim();
        }

        return "";
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
