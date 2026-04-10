package com.mysticai.orchestrator.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.orchestrator.config.AiOrchestrationProperties;
import com.mysticai.orchestrator.dto.admin.AiModelConfigDto;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.lang.reflect.Proxy;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class AiModelConfigServiceTest {

    @Test
    void shouldAppendBootstrapLocalProviderWithoutChangingExistingOrder() {
        AiOrchestrationProperties properties = bootstrapProperties();
        StubRedisTemplate redisTemplate = redisTemplateWithValue(runtimeConfigWithoutLocalProvider());
        AiModelConfigService service = new AiModelConfigService(properties, redisTemplate, new ObjectMapper());

        AiModelConfigDto config = service.getConfig();

        assertEquals(List.of("groqFast", "gemini", "localLlm"), config.complexChain());
        assertEquals(List.of("groqFast", "localLlm"), config.simpleChain());
        assertNotNull(config.providers().stream().filter(provider -> "localLlm".equals(provider.key())).findFirst().orElse(null));
        assertNotNull(redisTemplate.lastSetValue);
        assertEquals("ai:orchestrator:model-config:v1", redisTemplate.lastSetKey);
    }

    @Test
    void shouldRefreshExistingLocalProviderConnectionFieldsWhileKeepingAdminState() {
        AiOrchestrationProperties properties = bootstrapProperties();
        StubRedisTemplate redisTemplate = redisTemplateWithValue(runtimeConfigWithStaleLocalProvider());
        AiModelConfigService service = new AiModelConfigService(properties, redisTemplate, new ObjectMapper());

        AiModelConfigDto config = service.getConfig();
        var localProvider = config.providers().stream()
                .filter(provider -> "localLlm".equals(provider.key()))
                .findFirst()
                .orElseThrow();

        assertEquals(List.of("groqFast", "localLlm"), config.complexChain());
        assertEquals(List.of("groqFast"), config.simpleChain());
        assertFalse(localProvider.enabled());
        assertEquals("gemma3:4b", localProvider.model());
        assertEquals("http://127.0.0.1:11434", localProvider.baseUrl());
        assertEquals("ollama", localProvider.localProviderType());
        assertEquals("/api/generate", localProvider.chatEndpoint());
    }

    private AiOrchestrationProperties bootstrapProperties() {
        AiOrchestrationProperties properties = new AiOrchestrationProperties();
        properties.getFallback().setAllowMock(true);
        properties.getFallback().getChains().setComplex(List.of("gemini", "groqFast", "localLlm"));
        properties.getFallback().getChains().setSimple(List.of("groqFast", "localLlm"));

        Map<String, AiOrchestrationProperties.ProviderProperties> providers = new LinkedHashMap<>();
        providers.put("gemini", provider("gemini-2.5-flash", "https://generativelanguage.googleapis.com/v1beta", null, 8000));
        providers.put("groqFast", provider("openai/gpt-oss-120b", "https://api.groq.com/openai/v1", null, 8000));

        AiOrchestrationProperties.ProviderProperties local = provider("gemma3:4b", "http://127.0.0.1:11434", "ollama", 15000);
        local.setChatEndpoint("/api/generate");
        local.setTemperature(0.7);
        local.setMaxOutputTokens(1024);
        providers.put("localLlm", local);

        properties.setProviders(providers);
        return properties;
    }

    private AiOrchestrationProperties.ProviderProperties provider(String model, String baseUrl, String providerType, int timeoutMs) {
        AiOrchestrationProperties.ProviderProperties provider = new AiOrchestrationProperties.ProviderProperties();
        provider.setEnabled(true);
        provider.setModel(model);
        provider.setBaseUrl(baseUrl);
        provider.setProviderType(providerType);
        provider.setTimeoutMs(timeoutMs);
        return provider;
    }

    private StubRedisTemplate redisTemplateWithValue(Object value) {
        return new StubRedisTemplate(value);
    }

    private Map<String, Object> runtimeConfigWithoutLocalProvider() {
        return Map.of(
                "allowMock", true,
                "complexChain", List.of("groqFast", "gemini"),
                "simpleChain", List.of("groqFast"),
                "providers", Map.of(
                        "groqFast", runtimeProvider("groqFast", "groq", true, "openai/gpt-oss-120b", "https://api.groq.com/openai/v1", null, null),
                        "gemini", runtimeProvider("gemini", "gemini", true, "gemini-2.5-flash", "https://generativelanguage.googleapis.com/v1beta", null, null)
                )
        );
    }

    private Map<String, Object> runtimeConfigWithStaleLocalProvider() {
        return Map.of(
                "allowMock", true,
                "complexChain", List.of("groqFast", "localLlm"),
                "simpleChain", List.of("groqFast"),
                "providers", Map.of(
                        "groqFast", runtimeProvider("groqFast", "groq", true, "openai/gpt-oss-120b", "https://api.groq.com/openai/v1", null, null),
                        "localLlm", runtimeProvider("localLlm", "ollama", false, "llama3.2", "http://localhost:11434", "local", "/api/chat")
                )
        );
    }

    private Map<String, Object> runtimeProvider(
            String key,
            String adapter,
            boolean enabled,
            String model,
            String baseUrl,
            String localProviderType,
            String chatEndpoint
    ) {
        Map<String, Object> provider = new LinkedHashMap<>();
        provider.put("key", key);
        provider.put("displayName", key);
        provider.put("adapter", adapter);
        provider.put("enabled", enabled);
        provider.put("model", model);
        provider.put("baseUrl", baseUrl);
        provider.put("timeoutMs", 8000);
        provider.put("retryCount", 0);
        provider.put("cooldownSeconds", 60);
        provider.put("headers", Map.of());
        if (localProviderType != null) {
            provider.put("localProviderType", localProviderType);
        }
        if (chatEndpoint != null) {
            provider.put("chatEndpoint", chatEndpoint);
        }
        return provider;
    }

    private static final class StubRedisTemplate extends RedisTemplate<String, Object> {
        private final ValueOperations<String, Object> valueOperations;
        private Object storedValue;
        private String lastSetKey;
        private Object lastSetValue;

        private StubRedisTemplate(Object initialValue) {
            this.storedValue = initialValue;
            this.valueOperations = createValueOperations();
        }

        @Override
        public ValueOperations<String, Object> opsForValue() {
            return valueOperations;
        }

        @SuppressWarnings("unchecked")
        private ValueOperations<String, Object> createValueOperations() {
            return (ValueOperations<String, Object>) Proxy.newProxyInstance(
                    ValueOperations.class.getClassLoader(),
                    new Class[]{ValueOperations.class},
                    (proxy, method, args) -> {
                        String methodName = method.getName();
                        if ("get".equals(methodName)) {
                            return storedValue;
                        }
                        if ("set".equals(methodName)) {
                            lastSetKey = (String) args[0];
                            lastSetValue = args[1];
                            storedValue = args[1];
                            return null;
                        }
                        throw new UnsupportedOperationException("Unsupported ValueOperations method: " + methodName);
                    }
            );
        }
    }
}
