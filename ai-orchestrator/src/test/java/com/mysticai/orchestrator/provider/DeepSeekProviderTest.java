package com.mysticai.orchestrator.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.orchestrator.service.AiFailureType;
import com.mysticai.orchestrator.service.ProviderCallException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DeepSeekProviderTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void shouldSendTemperatureAndOmitReasoningEffortWhenThinkingDisabled() {
        DeepSeekProvider provider = deepSeekFlash();

        Map<String, Object> body = provider.buildRequestBody("prompt");

        assertEquals("deepseek-v4-flash", body.get("model"));
        assertEquals(0.7, body.get("temperature"));
        assertEquals(Map.of("type", "disabled"), body.get("thinking"));
        assertFalse(body.containsKey("reasoning_effort"));
    }

    @Test
    void shouldOmitTemperatureAndSendReasoningEffortWhenThinkingEnabled() {
        DeepSeekProvider provider = deepSeekPro();

        Map<String, Object> body = provider.buildRequestBody("prompt");

        assertEquals("deepseek-v4-pro", body.get("model"));
        assertFalse(body.containsKey("temperature"));
        assertEquals(Map.of("type", "enabled"), body.get("thinking"));
        assertEquals("high", body.get("reasoning_effort"));
    }

    @Test
    void shouldExtractContentAndIgnoreReasoningContent() throws Exception {
        DeepSeekProvider provider = deepSeekPro();
        JsonNode root = objectMapper.readTree("""
                {
                  "choices": [
                    {
                      "finish_reason": "stop",
                      "message": {
                        "content": "final answer",
                        "reasoning_content": "internal chain of thought, must not leak"
                      }
                    }
                  ]
                }
                """);

        String content = provider.extractContent(root);

        assertEquals("final answer", content);
        assertFalse(content.contains("chain of thought"));
        assertEquals("internal chain of thought, must not leak", provider.extractReasoningContent(root));
    }

    @Test
    void shouldReturnEmptyContentForMissingChoices() throws Exception {
        DeepSeekProvider provider = deepSeekFlash();
        JsonNode root = objectMapper.readTree("{\"choices\": []}");

        assertEquals("", provider.extractContent(root));
    }

    @Test
    void shouldReturnEmptyContentForNullMessageContent() throws Exception {
        DeepSeekProvider provider = deepSeekFlash();
        JsonNode root = objectMapper.readTree("""
                {"choices": [{"message": {"content": null}}]}
                """);

        assertEquals("", provider.extractContent(root));
    }

    @Test
    void shouldComputeCostFromCacheHitMissAndCompletionTokens() {
        DeepSeekProvider provider = deepSeekFlash();

        BigDecimal cost = provider.computeCostUsd("deepseek-v4-flash", 1_000_000, 1_000_000, 1_000_000);

        BigDecimal expected = new BigDecimal("0.0028").add(new BigDecimal("0.14")).add(new BigDecimal("0.28"))
                .setScale(8, java.math.RoundingMode.HALF_UP);
        assertEquals(0, expected.compareTo(cost));
    }

    @Test
    void shouldComputeCostForDeepSeekProPricing() {
        DeepSeekProvider provider = deepSeekPro();

        BigDecimal cost = provider.computeCostUsd("deepseek-v4-pro", 0, 500_000, 250_000);

        BigDecimal expected = new BigDecimal("0.435").multiply(new BigDecimal("0.5"))
                .add(new BigDecimal("0.87").multiply(new BigDecimal("0.25")))
                .setScale(8, java.math.RoundingMode.HALF_UP);
        assertEquals(0, expected.compareTo(cost));
    }

    @Test
    void shouldReturnNullCostForUnknownModel() {
        DeepSeekProvider provider = deepSeekFlash();

        assertNull(provider.computeCostUsd("some-other-model", 100, 100, 100));
    }

    @Test
    void shouldExposeProviderIdentity() {
        DeepSeekProvider provider = deepSeekFlash();

        assertEquals("deepseekFast", provider.providerKey());
        assertEquals("deepseek-v4-flash", provider.modelId());
        assertTrue(provider.getName().contains("deepseek-v4-flash"));
    }

    @Test
    void shouldFailFastWithMissingCredentialWhenApiKeyMissing() {
        DeepSeekProvider provider = new DeepSeekProvider(
                "deepseekFast",
                "DeepSeek Flash",
                "",
                "deepseek-v4-flash",
                "https://api.deepseek.com",
                30000,
                2000,
                0.7,
                "disabled",
                null,
                Map.of(),
                objectMapper
        );

        ProviderCallException ex = assertThrows(ProviderCallException.class, () -> provider.generateResponse("prompt"));

        assertEquals(AiFailureType.MISSING_CREDENTIAL, ex.getFailureType());
    }

    @Test
    void shouldReturnTruncatedContentSuccessfullyWithoutThrowingWhenLengthHasContent() throws Exception {
        DeepSeekProvider provider = deepSeekFlash();
        JsonNode root = objectMapper.readTree("""
                {"choices": [{"finish_reason": "length", "message": {"content": "partial but usable answer"}}]}
                """);

        String content = provider.resolveContentOrThrow("length", root, 200, "application/json", root.toString());

        assertEquals("partial but usable answer", content);
    }

    @Test
    void shouldThrowIncompleteResponseNotEmptyResponseWhenLengthHasNoContent() throws Exception {
        DeepSeekProvider provider = deepSeekFlash();
        JsonNode root = objectMapper.readTree("""
                {"choices": [{"finish_reason": "length", "message": {"content": ""}}]}
                """);

        ProviderCallException ex = assertThrows(ProviderCallException.class,
                () -> provider.resolveContentOrThrow("length", root, 200, "application/json", root.toString()));

        assertEquals(AiFailureType.INCOMPLETE_RESPONSE, ex.getFailureType());
    }

    @Test
    void shouldStillThrowEmptyResponseForBlankStopContent() throws Exception {
        DeepSeekProvider provider = deepSeekFlash();
        JsonNode root = objectMapper.readTree("""
                {"choices": [{"finish_reason": "stop", "message": {"content": ""}}]}
                """);

        ProviderCallException ex = assertThrows(ProviderCallException.class,
                () -> provider.resolveContentOrThrow("stop", root, 200, "application/json", root.toString()));

        assertEquals(AiFailureType.EMPTY_RESPONSE, ex.getFailureType());
    }

    @Test
    void shouldNotDoubleBillReasoningTokensAlreadyIncludedInCompletionTokens() {
        DeepSeekProvider provider = deepSeekPro();

        // usage.completion_tokens (200k here) is DeepSeek's already-inclusive billed output total;
        // reasoning_tokens (say 150k of those 200k) is only a breakdown field. computeCostUsd takes
        // completionTokens alone - there is no reasoningTokens parameter for it to add a second time.
        long completionTokensIncludingReasoning = 200_000;
        BigDecimal cost = provider.computeCostUsd("deepseek-v4-pro", 0, 0, completionTokensIncludingReasoning);

        BigDecimal expected = new BigDecimal("0.87").multiply(new BigDecimal("0.2"))
                .setScale(8, java.math.RoundingMode.HALF_UP);
        assertEquals(0, expected.compareTo(cost));
    }

    private DeepSeekProvider deepSeekFlash() {
        return new DeepSeekProvider(
                "deepseekFast",
                "DeepSeek Flash",
                "test-key",
                "deepseek-v4-flash",
                "https://api.deepseek.com",
                30000,
                2000,
                0.7,
                "disabled",
                null,
                Map.of(),
                objectMapper
        );
    }

    private DeepSeekProvider deepSeekPro() {
        return new DeepSeekProvider(
                "deepseekPro",
                "DeepSeek Pro",
                "test-key",
                "deepseek-v4-pro",
                "https://api.deepseek.com",
                90000,
                4000,
                null,
                "enabled",
                "high",
                Map.of(),
                objectMapper
        );
    }
}
