package com.mysticai.orchestrator.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.orchestrator.config.AiOrchestrationProperties;
import com.mysticai.orchestrator.config.AiRuntimeConfig;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
