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

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * DeepSeek provider using the OpenAI-compatible chat completions API.
 * Supports DeepSeek's "thinking" mode (reasoning) in addition to the
 * standard Groq/OpenRouter-style request shape: when thinking is enabled,
 * sampling params (temperature) are omitted and reasoning_effort is sent
 * instead; reasoning_content is read for cost accounting only and is
 * never returned to the caller.
 */
public class DeepSeekProvider implements AiModelProvider {

    private static final Logger log = LoggerFactory.getLogger(DeepSeekProvider.class);
    private static final int RAW_SNIPPET_LIMIT = 500;
    private static final BigDecimal PER_MILLION = new BigDecimal("1000000");

    // Per-model, per-effective-date pricing. Update this block (and pricingEffectiveDate) when
    // DeepSeek changes prices - do not scatter price literals elsewhere in this class.
    private static final String PRICING_EFFECTIVE_DATE = "2026-07-24";

    private static final Map<String, ModelPricing> PRICING = Map.of(
            "deepseek-v4-flash", new ModelPricing(
                    new BigDecimal("0.0028"), new BigDecimal("0.14"), new BigDecimal("0.28"), PRICING_EFFECTIVE_DATE),
            "deepseek-v4-pro", new ModelPricing(
                    new BigDecimal("0.003625"), new BigDecimal("0.435"), new BigDecimal("0.87"), PRICING_EFFECTIVE_DATE)
    );

    private final String providerKey;
    private final String name;
    private final String apiKey;
    private final String model;
    private final Integer maxTokens;
    private final Double temperature;
    private final boolean thinkingEnabled;
    private final String reasoningEffort;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public DeepSeekProvider(
            String providerKey,
            String name,
            String apiKey,
            String model,
            String baseUrl,
            int timeoutMs,
            Integer maxTokens,
            Double temperature,
            String thinkingMode,
            String reasoningEffort,
            Map<String, String> headers,
            ObjectMapper objectMapper
    ) {
        this.providerKey = providerKey;
        this.name = name;
        this.apiKey = apiKey;
        this.model = model;
        this.maxTokens = maxTokens;
        this.temperature = temperature;
        this.thinkingEnabled = "enabled".equalsIgnoreCase(thinkingMode);
        this.reasoningEffort = reasoningEffort;
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
        if (apiKey == null || apiKey.isBlank()) {
            // A missing key is a local configuration problem, not a remote auth rejection: it's
            // detected before any network call (zero cost, zero latency), must not be treated like
            // a network failure (no cooldown - see ProviderStateManager), and must not stop startup.
            throw new ProviderCallException(
                    "[" + providerKey + "] DeepSeek API key is missing",
                    AiFailureType.MISSING_CREDENTIAL,
                    null,
                    null,
                    null,
                    null
            );
        }

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
            String finishReason = root.path("choices").path(0).path("finish_reason").asText("");
            String content = resolveContentOrThrow(finishReason, root, statusCode, contentType, raw);

            logUsage(root);
            return content;
        } catch (ProviderCallException ex) {
            throw ex;
        } catch (RestClientResponseException ex) {
            throw new ProviderCallException(
                    "[" + providerKey + "] DeepSeek HTTP call failed: " + ex.getMessage(),
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
                    "[" + providerKey + "] DeepSeek request failed: " + ex.getMessage(),
                    AiFailureType.UNKNOWN,
                    null,
                    null,
                    null,
                    ex
            );
        }
    }

    Map<String, Object> buildRequestBody(String prompt) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", List.of(Map.of("role", "user", "content", prompt)));
        body.put("thinking", Map.of("type", thinkingEnabled ? "enabled" : "disabled"));

        if (thinkingEnabled) {
            if (reasoningEffort != null && !reasoningEffort.isBlank()) {
                body.put("reasoning_effort", reasoningEffort);
            }
        } else if (temperature != null) {
            body.put("temperature", temperature);
        }

        if (maxTokens != null && maxTokens > 0) {
            body.put("max_tokens", maxTokens);
        }
        body.put("stream", false);
        return body;
    }

    /**
     * Throws only for finish_reason values that make the response unusable regardless of content
     * (safety block / capacity). "length" is handled by the caller instead, since whether it's an
     * error depends on whether any content actually came back; "stop"/"tool_calls" fall through to
     * the blank-content check in {@link #generateResponse(String)}.
     *
     * Tool-call note: this codebase has no tool-calling architecture today (prompt-in, text-out
     * only), so finish_reason=tool_calls isn't specially handled here - it just falls through and,
     * with no text content, resolves as EMPTY_RESPONSE like any other blank reply. If DeepSeek
     * tool-calling is added later, remember that in thinking mode reasoning_content (see
     * {@link #extractReasoningContent(JsonNode)}) must be threaded back into the next tool-turn's
     * message history — DeepSeek's multi-turn tool-calling depends on it for reasoning continuity,
     * even though today we deliberately discard it (never return it to callers, never log it).
     */
    private void throwForBlockingFinishReason(String finishReason, Integer statusCode, String contentType, String raw) {
        if (finishReason == null || finishReason.isBlank()) {
            return;
        }

        switch (finishReason.toLowerCase(Locale.ROOT)) {
            case "content_filter" -> throw new ProviderCallException(
                    "[" + providerKey + "] response blocked by content filter",
                    AiFailureType.BAD_REQUEST,
                    statusCode,
                    contentType,
                    snippet(raw),
                    null
            );
            case "insufficient_system_resource" -> throw new ProviderCallException(
                    "[" + providerKey + "] DeepSeek reported insufficient system resources",
                    AiFailureType.SERVER_ERROR,
                    statusCode,
                    contentType,
                    snippet(raw),
                    null
            );
            default -> {
                // stop, length, tool_calls -> handled by the caller
            }
        }
    }

    /**
     * Resolves the final content string for a parsed response, or throws a classified
     * {@link ProviderCallException}. Split out from {@link #generateResponse(String)} so the
     * finish_reason=length truncation policy is unit-testable without a live HTTP call:
     * - length + non-blank content -> return content as-is (success, no retry, no fallback), warn-log.
     * - length + blank content -> INCOMPLETE_RESPONSE (not retried by this provider, see its javadoc).
     * - non-length + blank content -> EMPTY_RESPONSE (existing behavior; the fallback service retries
     *   this provider once, since a blank reply on finish_reason=stop is more likely transient).
     */
    String resolveContentOrThrow(String finishReason, JsonNode root, Integer statusCode, String contentType, String raw) {
        throwForBlockingFinishReason(finishReason, statusCode, contentType, raw);
        boolean truncated = "length".equalsIgnoreCase(finishReason);

        String content = extractContent(root);
        if (content.isBlank()) {
            if (log.isDebugEnabled()) {
                log.debug("[{}] empty DeepSeek content statusCode={} contentType={} rawSnippet={}",
                        providerKey, statusCode, contentType, snippet(raw));
            }
            if (truncated) {
                // max_tokens was hit before any content was produced at all. Retrying the same
                // provider with the same maxTokens would just fail identically and burn tokens
                // again, so this is intentionally NOT the same code path as generic EMPTY_RESPONSE
                // (which the fallback service retries once) - it goes straight to the next provider.
                log.warn("[{}] DeepSeek response truncated with no usable content (finish_reason=length) model={} maxTokens={} — skipping to next fallback provider, not retrying",
                        providerKey, model, maxTokens);
                throw new ProviderCallException(
                        "[" + providerKey + "] response truncated with no usable content (finish_reason=length)",
                        AiFailureType.INCOMPLETE_RESPONSE,
                        statusCode,
                        contentType,
                        snippet(raw),
                        null
                );
            }
            throw new ProviderCallException(
                    "[" + providerKey + "] empty content in DeepSeek response",
                    AiFailureType.EMPTY_RESPONSE,
                    statusCode,
                    contentType,
                    snippet(raw),
                    null
            );
        }

        if (truncated) {
            // Usable (if incomplete) content was produced - treat as a successful call so we don't
            // retry/fail-over and burn a second round of tokens for the same prompt. AiModelProvider
            // #generateResponse has no metadata channel today, so the caller only gets the (truncated)
            // text; the structured warning below is the truncation signal.
            log.warn("[{}] DeepSeek response truncated by max_tokens limit but usable content is present; returning as-is (no retry, no fallback) model={} maxTokens={} contentLength={}",
                    providerKey, model, maxTokens, content.length());
        }

        return content;
    }

    String extractContent(JsonNode root) {
        JsonNode choice = root.path("choices").path(0);
        if (choice.isMissingNode() || choice.isNull()) {
            return "";
        }
        return choice.path("message").path("content").asText("").trim();
    }

    String extractReasoningContent(JsonNode root) {
        return root.path("choices").path(0).path("message").path("reasoning_content").asText("");
    }

    private void logUsage(JsonNode root) {
        JsonNode usage = root.path("usage");
        if (usage.isMissingNode() || usage.isNull()) {
            return;
        }

        long promptTokens = usage.path("prompt_tokens").asLong(0);
        long cacheHitTokens = usage.path("prompt_cache_hit_tokens").asLong(0);
        long cacheMissTokens = usage.path("prompt_cache_miss_tokens").asLong(0);
        long completionTokens = usage.path("completion_tokens").asLong(0);
        long totalTokens = usage.path("total_tokens").asLong(0);
        // Reasoning tokens are a DeepSeek-reported breakdown of completionTokens, not additional to
        // it - logged for visibility only, never fed into computeCostUsd (see its javadoc).
        long reasoningTokens = usage.path("completion_tokens_details").path("reasoning_tokens").asLong(0);

        BigDecimal costUsd = computeCostUsd(model, cacheHitTokens, cacheMissTokens, completionTokens);

        log.info("[{}] DeepSeek usage model={} promptTokens={} cacheHitTokens={} cacheMissTokens={} completionTokens={} reasoningTokens={} totalTokens={} estimatedCostUsd={} pricingEffectiveDate={}",
                providerKey, model, promptTokens, cacheHitTokens, cacheMissTokens, completionTokens, reasoningTokens, totalTokens,
                costUsd != null ? costUsd.toPlainString() : "n/a", costUsd != null ? PRICING_EFFECTIVE_DATE : "n/a");
    }

    /**
     * completionTokens is DeepSeek's total billed output token count and already INCLUDES any
     * reasoning tokens (completion_tokens_details.reasoning_tokens is a subset breakdown, not an
     * addend) - do not also multiply reasoningTokens by outputPerMillion here, that would double-bill.
     * Returns null (not a wrong number) when the model has no pricing entry.
     */
    BigDecimal computeCostUsd(String model, long cacheHitTokens, long cacheMissTokens, long completionTokens) {
        if (model == null) {
            return null;
        }
        ModelPricing pricing = PRICING.get(model.toLowerCase(Locale.ROOT).trim());
        if (pricing == null) {
            return null;
        }

        BigDecimal cost = BigDecimal.ZERO
                .add(BigDecimal.valueOf(cacheHitTokens).divide(PER_MILLION, MathContext.DECIMAL64).multiply(pricing.cacheHitPerMillion()))
                .add(BigDecimal.valueOf(cacheMissTokens).divide(PER_MILLION, MathContext.DECIMAL64).multiply(pricing.cacheMissPerMillion()))
                .add(BigDecimal.valueOf(completionTokens).divide(PER_MILLION, MathContext.DECIMAL64).multiply(pricing.outputPerMillion()));

        return cost.setScale(8, RoundingMode.HALF_UP);
    }

    private JsonNode parseJson(String raw, Integer statusCode, String contentType) {
        try {
            return objectMapper.readTree(raw);
        } catch (JsonProcessingException ex) {
            throw new ProviderCallException(
                    "[" + providerKey + "] JSON parse failed for DeepSeek response",
                    AiFailureType.RESPONSE_PARSE_ERROR,
                    statusCode,
                    contentType,
                    snippet(raw),
                    ex
            );
        }
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

    private record ModelPricing(
            BigDecimal cacheHitPerMillion,
            BigDecimal cacheMissPerMillion,
            BigDecimal outputPerMillion,
            String effectiveDate
    ) {
    }
}
