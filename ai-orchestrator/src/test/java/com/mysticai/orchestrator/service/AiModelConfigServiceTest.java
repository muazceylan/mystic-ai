package com.mysticai.orchestrator.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.orchestrator.config.AiOrchestrationProperties;
import com.mysticai.orchestrator.dto.admin.AiModelConfigDto;
import com.mysticai.orchestrator.dto.admin.AiModelProviderConfigDto;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.lang.reflect.Proxy;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

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

    @Test
    void shouldPopulateAllBootstrapProvidersFromEmptyRedis() {
        AiOrchestrationProperties properties = bootstrapPropertiesWithDeepSeek();
        AiModelConfigService service = new AiModelConfigService(properties, redisTemplateWithValue(null), new ObjectMapper());

        AiModelConfigDto config = service.getConfig();

        assertEquals(4, config.providers().size());
        assertEquals(1, countProvidersWithKey(config, "deepseekFast"));
        assertEquals(1, countProvidersWithKey(config, "deepseekPro"));
        assertTrue(config.complexChain().contains("deepseekPro"));
        assertTrue(config.simpleChain().contains("deepseekFast"));
    }

    @Test
    void shouldAddOnlyMissingDeepSeekProvidersWithoutOverwritingExistingAdminValues() {
        AiOrchestrationProperties properties = bootstrapPropertiesWithDeepSeek();
        // Redis already has gemini (admin customized its model) and groqFast; deepseekFast/deepseekPro
        // are the only ones missing, simulating a code deploy that adds new bootstrap providers to an
        // environment that already has an admin-managed Redis config.
        Map<String, Object> existing = Map.of(
                "allowMock", true,
                "complexChain", List.of("gemini", "groqFast"),
                "simpleChain", List.of("groqFast"),
                "providers", Map.of(
                        "gemini", runtimeProvider("gemini", "gemini", true, "gemini-custom-admin-model", "https://custom.example/gemini", null, null),
                        "groqFast", runtimeProvider("groqFast", "groq", true, "openai/gpt-oss-120b", "https://api.groq.com/openai/v1", null, null)
                )
        );
        AiModelConfigService service = new AiModelConfigService(properties, redisTemplateWithValue(existing), new ObjectMapper());

        AiModelConfigDto config = service.getConfig();

        assertEquals(4, config.providers().size());
        var gemini = config.providers().stream().filter(p -> "gemini".equals(p.key())).findFirst().orElseThrow();
        assertEquals("gemini-custom-admin-model", gemini.model());
        assertEquals("https://custom.example/gemini", gemini.baseUrl());
        assertEquals(1, countProvidersWithKey(config, "deepseekFast"));
        assertEquals(1, countProvidersWithKey(config, "deepseekPro"));
        assertTrue(config.complexChain().contains("deepseekPro"));
        assertTrue(config.simpleChain().contains("deepseekFast"));
    }

    @Test
    void shouldBeIdempotentAcrossRepeatedStartupReads() {
        AiOrchestrationProperties properties = bootstrapPropertiesWithDeepSeek();
        AiModelConfigService service = new AiModelConfigService(properties, redisTemplateWithValue(null), new ObjectMapper());

        AiModelConfigDto first = service.getConfig();
        AiModelConfigDto second = service.getConfig();
        AiModelConfigDto third = service.getConfig();

        assertEquals(4, first.providers().size());
        assertEquals(4, second.providers().size());
        assertEquals(4, third.providers().size());
        assertEquals(1, countProvidersWithKey(third, "deepseekPro"));
        assertEquals(1, countProvidersWithKey(third, "deepseekFast"));
    }

    private long countProvidersWithKey(AiModelConfigDto config, String key) {
        return config.providers().stream().filter(p -> key.equals(p.key())).count();
    }

    private AiOrchestrationProperties bootstrapPropertiesWithDeepSeek() {
        AiOrchestrationProperties properties = new AiOrchestrationProperties();
        properties.getFallback().setAllowMock(true);
        properties.getFallback().getChains().setComplex(List.of("gemini", "groqFast", "deepseekPro"));
        properties.getFallback().getChains().setSimple(List.of("groqFast", "deepseekFast"));

        Map<String, AiOrchestrationProperties.ProviderProperties> providers = new LinkedHashMap<>();
        providers.put("gemini", provider("gemini-2.5-flash", "https://generativelanguage.googleapis.com/v1beta", null, 8000));
        providers.put("groqFast", provider("openai/gpt-oss-120b", "https://api.groq.com/openai/v1", null, 8000));

        AiOrchestrationProperties.ProviderProperties deepseekFast = provider("deepseek-v4-flash", "https://api.deepseek.com", null, 30000);
        deepseekFast.setThinkingMode("disabled");
        providers.put("deepseekFast", deepseekFast);

        AiOrchestrationProperties.ProviderProperties deepseekPro = provider("deepseek-v4-pro", "https://api.deepseek.com", null, 90000);
        deepseekPro.setThinkingMode("enabled");
        deepseekPro.setReasoningEffort("high");
        providers.put("deepseekPro", deepseekPro);

        properties.setProviders(providers);
        return properties;
    }

    @Test
    void shouldRejectInvalidReasoningEffortForDeepSeekProvider() {
        AiModelConfigService service = new AiModelConfigService(bootstrapProperties(), redisTemplateWithValue(null), new ObjectMapper());

        AiModelConfigDto request = new AiModelConfigDto(
                true,
                List.of("deepseekPro"),
                List.of("deepseekPro"),
                List.of(deepSeekProviderDto("enabled", "ultra-effort", null))
        );

        assertThrows(IllegalArgumentException.class, () -> service.update(request));
    }

    @Test
    void shouldRejectInvalidThinkingModeForDeepSeekProvider() {
        AiModelConfigService service = new AiModelConfigService(bootstrapProperties(), redisTemplateWithValue(null), new ObjectMapper());

        AiModelConfigDto request = new AiModelConfigDto(
                true,
                List.of("deepseekPro"),
                List.of("deepseekPro"),
                List.of(deepSeekProviderDto("sometimes", "high", null))
        );

        assertThrows(IllegalArgumentException.class, () -> service.update(request));
    }

    @Test
    void shouldRejectOutOfRangeTemperatureWhenThinkingDisabled() {
        AiModelConfigService service = new AiModelConfigService(bootstrapProperties(), redisTemplateWithValue(null), new ObjectMapper());

        AiModelConfigDto request = new AiModelConfigDto(
                true,
                List.of("deepseekPro"),
                List.of("deepseekPro"),
                List.of(deepSeekProviderDto("disabled", null, 3.5))
        );

        assertThrows(IllegalArgumentException.class, () -> service.update(request));
    }

    @Test
    void shouldPersistDeepSeekProviderIdempotentlyAcrossReads() {
        StubRedisTemplate redisTemplate = redisTemplateWithValue(null);
        AiModelConfigService service = new AiModelConfigService(bootstrapProperties(), redisTemplate, new ObjectMapper());

        AiModelConfigDto request = new AiModelConfigDto(
                true,
                List.of("deepseekPro"),
                List.of("deepseekPro"),
                List.of(deepSeekProviderDto("enabled", "high", null))
        );

        AiModelConfigDto saved = service.update(request);
        AiModelConfigDto reread = service.getConfig();
        AiModelConfigDto rereadAgain = service.getConfig();

        // localLlm is auto-synced from bootstrap properties on every read (existing behavior for the
        // ollama adapter); deepseekPro must appear exactly once and stay stable across repeated reads.
        assertEquals(reread.providers().size(), rereadAgain.providers().size());
        assertEquals(1, countProvidersWithKey(saved, "deepseekPro"));
        assertEquals(1, countProvidersWithKey(reread, "deepseekPro"));
        assertEquals(1, countProvidersWithKey(rereadAgain, "deepseekPro"));

        var provider = reread.providers().stream().filter(p -> "deepseekPro".equals(p.key())).findFirst().orElseThrow();
        assertEquals("deepseek", provider.adapter());
        assertEquals("enabled", provider.thinkingMode());
        assertEquals("high", provider.reasoningEffort());
        assertTrue(reread.complexChain().contains("deepseekPro"));
    }

    @Test
    void getResponseShouldNeverContainRawApiKeyAndShouldReportHasApiKeyCorrectly() {
        AiModelConfigService service = new AiModelConfigService(bootstrapProperties(), redisTemplateWithValue(null), new ObjectMapper());
        service.update(new AiModelConfigDto(true, List.of("deepseekPro"), List.of("deepseekPro"),
                List.of(deepSeekProviderDto("disabled", null, 0.7, "sk-real-secret-AAAA", false))));

        var provider = findProvider(service.getConfig(), "deepseekPro");

        assertNull(provider.apiKey());
        assertTrue(provider.hasApiKey());
        assertEquals("••••AAAA", provider.apiKeyMasked());
        assertEquals("READY", provider.status());
    }

    @Test
    void shouldReportMissingCredentialStatusAndFalseHasApiKeyWhenNoSecretStored() {
        AiModelConfigService service = new AiModelConfigService(bootstrapProperties(), redisTemplateWithValue(null), new ObjectMapper());
        service.update(new AiModelConfigDto(true, List.of("deepseekPro"), List.of("deepseekPro"),
                List.of(deepSeekProviderDto("disabled", null, 0.7, null, false))));

        var provider = findProvider(service.getConfig(), "deepseekPro");

        assertNull(provider.apiKey());
        assertFalse(provider.hasApiKey());
        assertNull(provider.apiKeyMasked());
        assertEquals("MISSING_CREDENTIAL", provider.status());
    }

    @Test
    void shouldPreserveExistingSecretWhenApiKeyOmittedOnUpdate() {
        AiModelConfigService service = new AiModelConfigService(bootstrapProperties(), redisTemplateWithValue(null), new ObjectMapper());
        service.update(new AiModelConfigDto(true, List.of("deepseekPro"), List.of("deepseekPro"),
                List.of(deepSeekProviderDto("disabled", null, 0.7, "sk-real-secret-AAAA", false))));
        String maskedBefore = findProvider(service.getConfig(), "deepseekPro").apiKeyMasked();

        // Second update changes an unrelated field (temperature) and omits apiKey entirely (null).
        service.update(new AiModelConfigDto(true, List.of("deepseekPro"), List.of("deepseekPro"),
                List.of(deepSeekProviderDto("disabled", null, 0.9, null, false))));
        AiModelProviderConfigDto after = findProvider(service.getConfig(), "deepseekPro");

        assertTrue(after.hasApiKey());
        assertEquals(maskedBefore, after.apiKeyMasked());
        assertEquals(0.9, after.temperature());
    }

    @Test
    void shouldUpdateSecretWhenNewRealValueProvided() {
        AiModelConfigService service = new AiModelConfigService(bootstrapProperties(), redisTemplateWithValue(null), new ObjectMapper());
        service.update(new AiModelConfigDto(true, List.of("deepseekPro"), List.of("deepseekPro"),
                List.of(deepSeekProviderDto("disabled", null, 0.7, "sk-real-secret-AAAA", false))));
        String maskedBefore = findProvider(service.getConfig(), "deepseekPro").apiKeyMasked();

        service.update(new AiModelConfigDto(true, List.of("deepseekPro"), List.of("deepseekPro"),
                List.of(deepSeekProviderDto("disabled", null, 0.7, "sk-different-secret-ZZZZ", false))));
        AiModelProviderConfigDto after = findProvider(service.getConfig(), "deepseekPro");

        assertTrue(after.hasApiKey());
        assertEquals("••••ZZZZ", after.apiKeyMasked());
        assertNotEquals(maskedBefore, after.apiKeyMasked());
    }

    @Test
    void shouldNotPersistMaskedPlaceholderAsRealSecretWhenFrontendRoundTripsIt() {
        AiModelConfigService service = new AiModelConfigService(bootstrapProperties(), redisTemplateWithValue(null), new ObjectMapper());
        service.update(new AiModelConfigDto(true, List.of("deepseekPro"), List.of("deepseekPro"),
                List.of(deepSeekProviderDto("disabled", null, 0.7, "sk-real-secret-AAAA", false))));
        String maskedBefore = findProvider(service.getConfig(), "deepseekPro").apiKeyMasked();

        // Simulates a buggy client echoing the GET response's apiKeyMasked value back as apiKey.
        service.update(new AiModelConfigDto(true, List.of("deepseekPro"), List.of("deepseekPro"),
                List.of(deepSeekProviderDto("disabled", null, 0.7, maskedBefore, false))));
        AiModelProviderConfigDto after = findProvider(service.getConfig(), "deepseekPro");

        assertTrue(after.hasApiKey());
        assertEquals(maskedBefore, after.apiKeyMasked());
    }

    @Test
    void shouldClearApiKeyWhenClearFlagIsSet() {
        AiModelConfigService service = new AiModelConfigService(bootstrapProperties(), redisTemplateWithValue(null), new ObjectMapper());
        service.update(new AiModelConfigDto(true, List.of("deepseekPro"), List.of("deepseekPro"),
                List.of(deepSeekProviderDto("disabled", null, 0.7, "sk-real-secret-AAAA", false))));

        service.update(new AiModelConfigDto(true, List.of("deepseekPro"), List.of("deepseekPro"),
                List.of(deepSeekProviderDto("disabled", null, 0.7, null, true))));
        AiModelProviderConfigDto after = findProvider(service.getConfig(), "deepseekPro");

        assertFalse(after.hasApiKey());
        assertNull(after.apiKeyMasked());
        assertEquals("MISSING_CREDENTIAL", after.status());
    }

    @Test
    void shouldReportDisabledStatusEvenWithoutApiKey() {
        AiModelConfigService service = new AiModelConfigService(bootstrapProperties(), redisTemplateWithValue(null), new ObjectMapper());
        AiModelProviderConfigDto disabledProvider = new AiModelProviderConfigDto(
                "deepseekPro", "DeepSeek Pro", "deepseek", false, "deepseek-v4-pro", "https://api.deepseek.com",
                null, false, null, false, null, null, 90000, 1, 90, 0.7, 4000, "disabled", null, null, Map.of()
        );
        service.update(new AiModelConfigDto(true, List.of("deepseekPro"), List.of("deepseekPro"), List.of(disabledProvider)));

        var provider = findProvider(service.getConfig(), "deepseekPro");

        assertEquals("DISABLED", provider.status());
    }

    private AiModelProviderConfigDto findProvider(AiModelConfigDto config, String key) {
        return config.providers().stream().filter(p -> key.equals(p.key())).findFirst().orElseThrow();
    }

    private AiModelProviderConfigDto deepSeekProviderDto(String thinkingMode, String reasoningEffort, Double temperature) {
        return deepSeekProviderDto(thinkingMode, reasoningEffort, temperature, "test-key", false);
    }

    private AiModelProviderConfigDto deepSeekProviderDto(
            String thinkingMode,
            String reasoningEffort,
            Double temperature,
            String apiKey,
            boolean clearApiKey
    ) {
        return new AiModelProviderConfigDto(
                "deepseekPro",
                "DeepSeek Pro",
                "deepseek",
                true,
                "deepseek-v4-pro",
                "https://api.deepseek.com",
                apiKey,
                false, // hasApiKey: output-only, ignored on input
                null,  // apiKeyMasked: output-only, ignored on input
                clearApiKey,
                null,
                null,
                90000,
                1,
                90,
                temperature,
                4000,
                thinkingMode,
                reasoningEffort,
                null, // status: output-only, ignored on input
                Map.of()
        );
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
                // gemini is included (unchanged from bootstrapProperties()' default) so this fixture
                // isolates the ollama-connection-refresh behavior under test; since gemini already
                // exists here, the generic "add missing bootstrap provider" merge is a no-op for it,
                // and the assertions below stay focused on localLlm.
                "providers", Map.of(
                        "groqFast", runtimeProvider("groqFast", "groq", true, "openai/gpt-oss-120b", "https://api.groq.com/openai/v1", null, null),
                        "gemini", runtimeProvider("gemini", "gemini", true, "gemini-2.5-flash", "https://generativelanguage.googleapis.com/v1beta", null, null),
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
