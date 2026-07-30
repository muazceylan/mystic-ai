package com.mysticai.orchestrator.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.orchestrator.config.AiOrchestrationProperties;
import com.mysticai.orchestrator.config.AiRuntimeConfig;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AiFallbackServiceTest {

    @Test
    void shouldContinueToNextProviderWhenLocalLlmTimesOut() {
        AiRuntimeConfig config = new AiRuntimeConfig();
        config.setAllowMock(true);
        config.setSimpleChain(List.of("localLlm", "gemini"));

        AiRuntimeConfig.ProviderConfig local = provider("localLlm", "Local Llm", AiModelConfigService.ADAPTER_OLLAMA, "qwen2.5:1.5b");
        local.setTimeoutMs(30000);

        AiRuntimeConfig.ProviderConfig gemini = provider("gemini", "Gemini", AiModelConfigService.ADAPTER_GEMINI, "gemini-2.5-flash");

        Map<String, AiRuntimeConfig.ProviderConfig> providers = new LinkedHashMap<>();
        providers.put(local.getKey(), local);
        providers.put(gemini.getKey(), gemini);
        config.setProviders(providers);

        AiFallbackService service = new AiFallbackService(
                new StubAiModelConfigService(config),
                new StubAiProviderRuntimeInvoker(),
                new FailureClassifier(),
                new ProviderStateManager(),
                new MockInterpretationService()
        );

        String result = service.generate("prompt", false);

        assertEquals("gemini-success", result);
    }

    @Test
    void paidGenerationCanDisableMockFallbackEvenWhenRuntimeAllowsIt() {
        AiRuntimeConfig config = new AiRuntimeConfig();
        config.setAllowMock(true);
        config.setComplexChain(List.of());
        config.setProviders(Map.of());
        AiFallbackService service = new AiFallbackService(
                new StubAiModelConfigService(config),
                new StubAiProviderRuntimeInvoker(),
                new FailureClassifier(),
                new ProviderStateManager(),
                new MockInterpretationService()
        );

        assertThrows(IllegalStateException.class,
                () -> service.generate("paid dream prompt", true, false));
    }

    @Test
    void shouldNotRetrySameProviderOnIncompleteResponseAndMoveToNextProvider() {
        AiRuntimeConfig config = new AiRuntimeConfig();
        config.setAllowMock(true);
        config.setSimpleChain(List.of("deepseekFast", "gemini"));

        AiRuntimeConfig.ProviderConfig deepseek = provider("deepseekFast", "DeepSeek Flash", AiModelConfigService.ADAPTER_DEEPSEEK, "deepseek-v4-flash");
        deepseek.setRetryCount(2); // even with retries configured, INCOMPLETE_RESPONSE must not use them
        AiRuntimeConfig.ProviderConfig gemini = provider("gemini", "Gemini", AiModelConfigService.ADAPTER_GEMINI, "gemini-2.5-flash");

        Map<String, AiRuntimeConfig.ProviderConfig> providers = new LinkedHashMap<>();
        providers.put(deepseek.getKey(), deepseek);
        providers.put(gemini.getKey(), gemini);
        config.setProviders(providers);

        AtomicInteger deepseekCallCount = new AtomicInteger(0);
        AiFallbackService service = new AiFallbackService(
                new StubAiModelConfigService(config),
                new CountingIncompleteResponseInvoker(deepseekCallCount),
                new FailureClassifier(),
                new ProviderStateManager(),
                new MockInterpretationService()
        );

        String result = service.generate("prompt", false);

        assertEquals("gemini-success", result);
        assertEquals(1, deepseekCallCount.get());
    }

    private AiRuntimeConfig.ProviderConfig provider(String key, String displayName, String adapter, String model) {
        AiRuntimeConfig.ProviderConfig provider = new AiRuntimeConfig.ProviderConfig();
        provider.setKey(key);
        provider.setDisplayName(displayName);
        provider.setAdapter(adapter);
        provider.setEnabled(true);
        provider.setModel(model);
        provider.setBaseUrl("http://example.test");
        provider.setRetryCount(0);
        provider.setCooldownSeconds(0);
        return provider;
    }

    private static final class StubAiProviderRuntimeInvoker extends AiProviderRuntimeInvoker {
        private StubAiProviderRuntimeInvoker() {
            super(new ObjectMapper());
        }

        @Override
        public String generateResponse(AiRuntimeConfig.ProviderConfig provider, String prompt) {
            if ("localLlm".equals(provider.getKey())) {
                throw new ProviderCallException(
                        "[localLlm] request failed: Read timed out",
                        AiFailureType.TIMEOUT,
                        null,
                        null,
                        null,
                        null
                );
            }
            return "gemini-success";
        }
    }

    private static final class CountingIncompleteResponseInvoker extends AiProviderRuntimeInvoker {
        private final AtomicInteger deepseekCallCount;

        private CountingIncompleteResponseInvoker(AtomicInteger deepseekCallCount) {
            super(new ObjectMapper());
            this.deepseekCallCount = deepseekCallCount;
        }

        @Override
        public String generateResponse(AiRuntimeConfig.ProviderConfig provider, String prompt) {
            if ("deepseekFast".equals(provider.getKey())) {
                deepseekCallCount.incrementAndGet();
                throw new ProviderCallException(
                        "[deepseekFast] response truncated with no usable content (finish_reason=length)",
                        AiFailureType.INCOMPLETE_RESPONSE,
                        200,
                        "application/json",
                        null,
                        null
                );
            }
            return "gemini-success";
        }
    }

    private static final class StubAiModelConfigService extends AiModelConfigService {
        private final AiRuntimeConfig config;

        private StubAiModelConfigService(AiRuntimeConfig config) {
            super(new AiOrchestrationProperties(), new RedisTemplate<>(), new ObjectMapper());
            this.config = config;
        }

        @Override
        public synchronized AiRuntimeConfig getRuntimeConfigSnapshot() {
            return config;
        }
    }
}
