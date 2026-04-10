package com.mysticai.orchestrator.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.orchestrator.config.AiOrchestrationProperties;
import com.mysticai.orchestrator.config.AiRuntimeConfig;
import com.mysticai.orchestrator.dto.admin.AiModelConfigDto;
import com.mysticai.orchestrator.dto.admin.AiModelProviderConfigDto;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class AiModelConfigService {

    private static final Logger log = LoggerFactory.getLogger(AiModelConfigService.class);

    public static final String ADAPTER_GEMINI = "gemini";
    public static final String ADAPTER_GROQ = "groq";
    public static final String ADAPTER_OPENROUTER = "openrouter";
    public static final String ADAPTER_OLLAMA = "ollama";

    private static final Set<String> SUPPORTED_ADAPTERS = Set.of(
            ADAPTER_GEMINI,
            ADAPTER_GROQ,
            ADAPTER_OPENROUTER,
            ADAPTER_OLLAMA
    );

    private static final String REDIS_KEY = "ai:orchestrator:model-config:v1";

    private final AiOrchestrationProperties properties;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    private AiRuntimeConfig cachedConfig;

    public AiModelConfigService(
            AiOrchestrationProperties properties,
            RedisTemplate<String, Object> redisTemplate,
            ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        synchronized (this) {
            AiRuntimeConfig config = refreshFromRedisOrDefaults();
            cachedConfig = config;
        }
    }

    public synchronized AiModelConfigDto getConfig() {
        AiRuntimeConfig config = refreshFromRedisOrDefaults();
        cachedConfig = config;
        return toDto(config);
    }

    public synchronized AiRuntimeConfig getRuntimeConfigSnapshot() {
        AiRuntimeConfig config = refreshFromRedisOrDefaults();
        cachedConfig = config;
        return deepCopy(config);
    }

    public synchronized AiModelConfigDto update(AiModelConfigDto request) {
        if (request == null) {
            throw new IllegalArgumentException("Config payload is required");
        }

        AiRuntimeConfig next = normalizeAndValidate(fromDto(request));
        next = mergeBootstrapProviders(next, propertyDefaults());
        cachedConfig = next;
        writeToRedis(next);
        return toDto(next);
    }

    private AiRuntimeConfig refreshFromRedisOrDefaults() {
        AiRuntimeConfig defaults = propertyDefaults();
        AiRuntimeConfig fromRedis = readFromRedis();
        if (fromRedis != null) {
            AiRuntimeConfig merged = mergeBootstrapProviders(fromRedis, defaults);
            if (!configsEqual(fromRedis, merged)) {
                writeToRedis(merged);
            }
            return merged;
        }

        if (cachedConfig != null) {
            return mergeBootstrapProviders(cachedConfig, defaults);
        }

        writeToRedis(defaults);
        return defaults;
    }

    private AiRuntimeConfig propertyDefaults() {
        return normalizeAndValidate(fromProperties());
    }

    private AiRuntimeConfig readFromRedis() {
        try {
            Object raw = redisTemplate.opsForValue().get(REDIS_KEY);
            if (raw == null) {
                return null;
            }

            AiRuntimeConfig parsed = objectMapper.convertValue(raw, AiRuntimeConfig.class);
            return normalizeAndValidate(parsed);
        } catch (Exception ex) {
            log.warn("[AI Config] Failed reading runtime config from Redis key={} reason={}", REDIS_KEY, ex.getMessage());
            return null;
        }
    }

    private void writeToRedis(AiRuntimeConfig config) {
        try {
            redisTemplate.opsForValue().set(REDIS_KEY, config);
        } catch (Exception ex) {
            log.warn("[AI Config] Failed writing runtime config to Redis key={} reason={}", REDIS_KEY, ex.getMessage());
        }
    }

    private AiRuntimeConfig fromProperties() {
        AiRuntimeConfig config = new AiRuntimeConfig();
        config.setAllowMock(properties.getFallback().isAllowMock());
        config.setComplexChain(copyList(properties.getFallback().getChains().getComplex()));
        config.setSimpleChain(copyList(properties.getFallback().getChains().getSimple()));

        Map<String, AiRuntimeConfig.ProviderConfig> providers = new LinkedHashMap<>();
        for (Map.Entry<String, AiOrchestrationProperties.ProviderProperties> entry : properties.getProviders().entrySet()) {
            String key = entry.getKey();
            AiOrchestrationProperties.ProviderProperties source = entry.getValue();

            AiRuntimeConfig.ProviderConfig target = new AiRuntimeConfig.ProviderConfig();
            target.setKey(key);
            target.setDisplayName(defaultDisplayName(key));
            target.setAdapter(inferAdapter(key, source.getProviderType(), source.getBaseUrl()));
            target.setEnabled(source.isEnabled());
            target.setModel(source.getModel());
            target.setBaseUrl(source.getBaseUrl());
            target.setApiKey(source.getApiKey());
            target.setLocalProviderType(source.getProviderType());
            target.setChatEndpoint(source.getChatEndpoint());
            target.setHeaders(copyMap(source.getHeaders()));
            target.setTimeoutMs(source.getTimeoutMs());
            target.setRetryCount(source.getRetryCount());
            target.setCooldownSeconds(source.getCooldownSeconds());
            target.setTemperature(source.getTemperature());
            target.setMaxOutputTokens(source.getMaxOutputTokens());

            providers.put(key, target);
        }

        config.setProviders(providers);
        return config;
    }

    private AiRuntimeConfig fromDto(AiModelConfigDto dto) {
        AiRuntimeConfig config = new AiRuntimeConfig();
        config.setAllowMock(dto.allowMock());
        config.setComplexChain(copyList(dto.complexChain()));
        config.setSimpleChain(copyList(dto.simpleChain()));

        Map<String, AiRuntimeConfig.ProviderConfig> providers = new LinkedHashMap<>();
        if (dto.providers() != null) {
            for (AiModelProviderConfigDto providerDto : dto.providers()) {
                if (providerDto == null) {
                    continue;
                }
                AiRuntimeConfig.ProviderConfig provider = new AiRuntimeConfig.ProviderConfig();
                provider.setKey(providerDto.key());
                provider.setDisplayName(providerDto.displayName());
                provider.setAdapter(providerDto.adapter());
                provider.setEnabled(providerDto.enabled());
                provider.setModel(providerDto.model());
                provider.setBaseUrl(providerDto.baseUrl());
                provider.setApiKey(providerDto.apiKey());
                provider.setLocalProviderType(providerDto.localProviderType());
                provider.setChatEndpoint(providerDto.chatEndpoint());
                provider.setTimeoutMs(providerDto.timeoutMs());
                provider.setRetryCount(providerDto.retryCount());
                provider.setCooldownSeconds(providerDto.cooldownSeconds());
                provider.setTemperature(providerDto.temperature());
                provider.setMaxOutputTokens(providerDto.maxOutputTokens());
                provider.setHeaders(copyMap(providerDto.headers()));

                providers.put(providerDto.key(), provider);
            }
        }

        config.setProviders(providers);
        return config;
    }

    private AiModelConfigDto toDto(AiRuntimeConfig config) {
        List<AiModelProviderConfigDto> providers = new ArrayList<>();
        for (AiRuntimeConfig.ProviderConfig provider : config.getProviders().values()) {
            providers.add(new AiModelProviderConfigDto(
                    provider.getKey(),
                    provider.getDisplayName(),
                    provider.getAdapter(),
                    provider.isEnabled(),
                    provider.getModel(),
                    provider.getBaseUrl(),
                    provider.getApiKey(),
                    provider.getLocalProviderType(),
                    provider.getChatEndpoint(),
                    provider.getTimeoutMs(),
                    provider.getRetryCount(),
                    provider.getCooldownSeconds(),
                    provider.getTemperature(),
                    provider.getMaxOutputTokens(),
                    copyMap(provider.getHeaders())
            ));
        }

        return new AiModelConfigDto(
                config.isAllowMock(),
                copyList(config.getComplexChain()),
                copyList(config.getSimpleChain()),
                providers
        );
    }

    private AiRuntimeConfig normalizeAndValidate(AiRuntimeConfig input) {
        if (input == null) {
            throw new IllegalArgumentException("Config payload is required");
        }

        AiRuntimeConfig normalized = new AiRuntimeConfig();
        normalized.setAllowMock(input.isAllowMock());

        Map<String, AiRuntimeConfig.ProviderConfig> providers = normalizeProviders(input.getProviders());
        if (providers.isEmpty()) {
            throw new IllegalArgumentException("At least one provider is required");
        }

        List<String> complexChain = normalizeChain(input.getComplexChain());
        List<String> simpleChain = normalizeChain(input.getSimpleChain());

        validateChain("complexChain", complexChain, providers.keySet());
        validateChain("simpleChain", simpleChain, providers.keySet());

        normalized.setProviders(providers);
        normalized.setComplexChain(complexChain);
        normalized.setSimpleChain(simpleChain);

        return normalized;
    }

    private Map<String, AiRuntimeConfig.ProviderConfig> normalizeProviders(Map<String, AiRuntimeConfig.ProviderConfig> input) {
        Map<String, AiRuntimeConfig.ProviderConfig> normalized = new LinkedHashMap<>();
        if (input == null) {
            return normalized;
        }

        for (Map.Entry<String, AiRuntimeConfig.ProviderConfig> entry : input.entrySet()) {
            AiRuntimeConfig.ProviderConfig source = entry.getValue();
            String key = normalizeKey(source != null && hasText(source.getKey()) ? source.getKey() : entry.getKey());
            if (!hasText(key)) {
                throw new IllegalArgumentException("Provider key cannot be blank");
            }
            if (normalized.containsKey(key)) {
                throw new IllegalArgumentException("Provider key must be unique: " + key);
            }

            AiRuntimeConfig.ProviderConfig target = new AiRuntimeConfig.ProviderConfig();
            target.setKey(key);
            target.setDisplayName(hasText(source != null ? source.getDisplayName() : null)
                    ? source.getDisplayName().trim()
                    : defaultDisplayName(key));

            String adapter = inferAdapter(
                    key,
                    source != null ? source.getAdapter() : null,
                    source != null ? source.getBaseUrl() : null
            );
            if (!SUPPORTED_ADAPTERS.contains(adapter)) {
                throw new IllegalArgumentException("Unsupported provider adapter for " + key + ": " + adapter);
            }

            target.setAdapter(adapter);
            target.setEnabled(source == null || source.isEnabled());
            target.setModel(hasText(source != null ? source.getModel() : null)
                    ? source.getModel().trim()
                    : defaultModelFor(adapter));
            target.setBaseUrl(hasText(source != null ? source.getBaseUrl() : null)
                    ? source.getBaseUrl().trim()
                    : defaultBaseUrlFor(adapter));
            target.setApiKey(source == null ? null : trimToNull(source.getApiKey()));
            target.setTimeoutMs(source != null && source.getTimeoutMs() > 0
                    ? source.getTimeoutMs()
                    : defaultTimeoutFor(adapter));
            target.setRetryCount(Math.max(source != null ? source.getRetryCount() : 0, 0));
            target.setCooldownSeconds(Math.max(source != null ? source.getCooldownSeconds() : 0, 0));
            target.setTemperature(source == null ? null : source.getTemperature());
            target.setMaxOutputTokens(source == null ? null : source.getMaxOutputTokens());
            target.setHeaders(normalizeHeaders(source == null ? null : source.getHeaders()));

            if (ADAPTER_OLLAMA.equals(adapter)) {
                target.setLocalProviderType(hasText(source != null ? source.getLocalProviderType() : null)
                        ? source.getLocalProviderType().trim()
                        : ADAPTER_OLLAMA);
                target.setChatEndpoint(hasText(source != null ? source.getChatEndpoint() : null)
                        ? source.getChatEndpoint().trim()
                        : "/api/generate");
            }

            if (!hasText(target.getModel())) {
                throw new IllegalArgumentException("Provider model is required: " + key);
            }
            if (!hasText(target.getBaseUrl())) {
                throw new IllegalArgumentException("Provider baseUrl is required: " + key);
            }

            normalized.put(key, target);
        }

        return normalized;
    }

    private void validateChain(String chainName, List<String> chain, Set<String> providerKeys) {
        for (String key : chain) {
            if (!providerKeys.contains(key)) {
                throw new IllegalArgumentException(chainName + " contains unknown provider key: " + key);
            }
        }
    }

    private List<String> normalizeChain(List<String> chain) {
        if (chain == null) {
            return new ArrayList<>();
        }
        LinkedHashSet<String> deduped = new LinkedHashSet<>();
        for (String value : chain) {
            String key = normalizeKey(value);
            if (hasText(key)) {
                deduped.add(key);
            }
        }
        return new ArrayList<>(deduped);
    }

    private Map<String, String> normalizeHeaders(Map<String, String> source) {
        Map<String, String> normalized = new LinkedHashMap<>();
        if (source == null) {
            return normalized;
        }
        for (Map.Entry<String, String> entry : source.entrySet()) {
            String key = entry.getKey();
            if (!hasText(key)) {
                continue;
            }
            normalized.put(key.trim(), entry.getValue());
        }
        return normalized;
    }

    private String inferAdapter(String providerKey, String rawAdapter, String baseUrl) {
        String normalizedRaw = normalizeAdapter(rawAdapter);
        if (normalizedRaw != null) {
            return normalizedRaw;
        }

        String lowerKey = providerKey == null ? "" : providerKey.toLowerCase(Locale.ROOT);
        if (lowerKey.contains("gemini")) {
            return ADAPTER_GEMINI;
        }
        if (lowerKey.contains("openrouter")) {
            return ADAPTER_OPENROUTER;
        }
        if (lowerKey.contains("local") || lowerKey.contains("ollama")) {
            return ADAPTER_OLLAMA;
        }
        if (lowerKey.contains("groq")) {
            return ADAPTER_GROQ;
        }

        String lowerBaseUrl = baseUrl == null ? "" : baseUrl.toLowerCase(Locale.ROOT);
        if (lowerBaseUrl.contains("generativelanguage.googleapis.com")) {
            return ADAPTER_GEMINI;
        }
        if (lowerBaseUrl.contains("openrouter.ai")) {
            return ADAPTER_OPENROUTER;
        }
        if (lowerBaseUrl.contains("localhost:11434") || lowerBaseUrl.contains("ollama")) {
            return ADAPTER_OLLAMA;
        }
        if (lowerBaseUrl.contains("api.groq.com")) {
            return ADAPTER_GROQ;
        }

        return ADAPTER_GROQ;
    }

    private String normalizeAdapter(String rawAdapter) {
        if (!hasText(rawAdapter)) {
            return null;
        }
        String normalized = rawAdapter.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "google", "gemini" -> ADAPTER_GEMINI;
            case "groq", "openai-compatible-groq" -> ADAPTER_GROQ;
            case "openrouter" -> ADAPTER_OPENROUTER;
            case "local", "local-llm", "localllm", "ollama" -> ADAPTER_OLLAMA;
            default -> normalized;
        };
    }

    private String defaultDisplayName(String key) {
        if (!hasText(key)) {
            return "Provider";
        }
        String[] parts = key.trim().split("(?=[A-Z])|[-_ ]+");
        StringBuilder builder = new StringBuilder();
        for (String part : parts) {
            if (!hasText(part)) {
                continue;
            }
            if (builder.length() > 0) {
                builder.append(' ');
            }
            builder.append(part.substring(0, 1).toUpperCase(Locale.ROOT));
            if (part.length() > 1) {
                builder.append(part.substring(1));
            }
        }
        return builder.length() == 0 ? key : builder.toString();
    }

    private String defaultModelFor(String adapter) {
        return switch (adapter) {
            case ADAPTER_GEMINI -> "gemini-2.5-flash";
            case ADAPTER_OPENROUTER -> "openrouter/auto";
            case ADAPTER_OLLAMA -> "gemma3:4b";
            case ADAPTER_GROQ -> "openai/gpt-oss-120b";
            default -> "openai/gpt-oss-120b";
        };
    }

    private String defaultBaseUrlFor(String adapter) {
        return switch (adapter) {
            case ADAPTER_GEMINI -> "https://generativelanguage.googleapis.com/v1beta";
            case ADAPTER_OPENROUTER -> "https://openrouter.ai/api/v1";
            case ADAPTER_OLLAMA -> "http://localhost:11434";
            case ADAPTER_GROQ -> "https://api.groq.com/openai/v1";
            default -> "https://api.groq.com/openai/v1";
        };
    }

    private int defaultTimeoutFor(String adapter) {
        return switch (adapter) {
            case ADAPTER_OLLAMA -> 15000;
            case ADAPTER_OPENROUTER -> 10000;
            default -> 8000;
        };
    }

    private AiRuntimeConfig deepCopy(AiRuntimeConfig source) {
        return objectMapper.convertValue(source, AiRuntimeConfig.class);
    }

    private AiRuntimeConfig.ProviderConfig deepCopyProvider(AiRuntimeConfig.ProviderConfig source) {
        return objectMapper.convertValue(source, AiRuntimeConfig.ProviderConfig.class);
    }

    private List<String> copyList(List<String> source) {
        if (source == null) {
            return new ArrayList<>();
        }
        return new ArrayList<>(source);
    }

    private Map<String, String> copyMap(Map<String, String> source) {
        if (source == null) {
            return new LinkedHashMap<>();
        }
        return new LinkedHashMap<>(source);
    }

    private String normalizeKey(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private String trimToNull(String value) {
        if (!hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private AiRuntimeConfig mergeBootstrapProviders(AiRuntimeConfig runtimeConfig, AiRuntimeConfig defaults) {
        AiRuntimeConfig merged = deepCopy(runtimeConfig);
        Map<String, AiRuntimeConfig.ProviderConfig> mergedProviders = new LinkedHashMap<>();
        if (merged.getProviders() != null) {
            merged.getProviders().forEach((key, value) -> mergedProviders.put(key, deepCopyProvider(value)));
        }

        if (defaults.getProviders() != null) {
            for (Map.Entry<String, AiRuntimeConfig.ProviderConfig> entry : defaults.getProviders().entrySet()) {
                String providerKey = entry.getKey();
                AiRuntimeConfig.ProviderConfig bootstrapProvider = entry.getValue();
                if (!shouldBootstrapProvider(bootstrapProvider)) {
                    continue;
                }
                AiRuntimeConfig.ProviderConfig existingProvider = mergedProviders.get(providerKey);

                if (existingProvider == null) {
                    mergedProviders.put(providerKey, deepCopyProvider(bootstrapProvider));
                    appendProviderIfMissing(merged.getComplexChain(), providerKey, defaults.getComplexChain(), bootstrapProvider.isEnabled());
                    appendProviderIfMissing(merged.getSimpleChain(), providerKey, defaults.getSimpleChain(), bootstrapProvider.isEnabled());
                    log.info("[AI Config] Added bootstrap provider {} to runtime config", providerKey);
                    continue;
                }

                if (shouldSyncBootstrapConnection(bootstrapProvider)) {
                    mergedProviders.put(providerKey, mergeExistingWithBootstrap(existingProvider, bootstrapProvider));
                }
            }
        }

        merged.setProviders(mergedProviders);
        return normalizeAndValidate(merged);
    }

    private void appendProviderIfMissing(
            List<String> runtimeChain,
            String providerKey,
            List<String> defaultChain,
            boolean bootstrapEnabled
    ) {
        if (!bootstrapEnabled || runtimeChain == null || providerKey == null || defaultChain == null) {
            return;
        }
        if (runtimeChain.contains(providerKey) || !defaultChain.contains(providerKey)) {
            return;
        }
        runtimeChain.add(providerKey);
    }

    private boolean shouldSyncBootstrapConnection(AiRuntimeConfig.ProviderConfig bootstrapProvider) {
        return bootstrapProvider != null && ADAPTER_OLLAMA.equals(bootstrapProvider.getAdapter());
    }

    private boolean shouldBootstrapProvider(AiRuntimeConfig.ProviderConfig bootstrapProvider) {
        return shouldSyncBootstrapConnection(bootstrapProvider);
    }

    private AiRuntimeConfig.ProviderConfig mergeExistingWithBootstrap(
            AiRuntimeConfig.ProviderConfig existingProvider,
            AiRuntimeConfig.ProviderConfig bootstrapProvider
    ) {
        AiRuntimeConfig.ProviderConfig mergedProvider = deepCopyProvider(existingProvider);
        mergedProvider.setAdapter(bootstrapProvider.getAdapter());
        mergedProvider.setModel(bootstrapProvider.getModel());
        mergedProvider.setBaseUrl(bootstrapProvider.getBaseUrl());
        mergedProvider.setLocalProviderType(bootstrapProvider.getLocalProviderType());
        mergedProvider.setChatEndpoint(bootstrapProvider.getChatEndpoint());
        mergedProvider.setTimeoutMs(bootstrapProvider.getTimeoutMs());
        mergedProvider.setTemperature(bootstrapProvider.getTemperature());
        mergedProvider.setMaxOutputTokens(bootstrapProvider.getMaxOutputTokens());
        return mergedProvider;
    }

    private boolean configsEqual(AiRuntimeConfig left, AiRuntimeConfig right) {
        return objectMapper.valueToTree(left).equals(objectMapper.valueToTree(right));
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
