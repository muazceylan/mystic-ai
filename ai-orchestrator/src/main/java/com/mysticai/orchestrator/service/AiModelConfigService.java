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
    public static final String ADAPTER_DEEPSEEK = "deepseek";

    private static final Set<String> SUPPORTED_ADAPTERS = Set.of(
            ADAPTER_GEMINI,
            ADAPTER_GROQ,
            ADAPTER_OPENROUTER,
            ADAPTER_OLLAMA,
            ADAPTER_DEEPSEEK
    );

    private static final Set<String> REASONING_EFFORT_VALUES = Set.of("high", "max");
    private static final String THINKING_ENABLED = "enabled";
    private static final String THINKING_DISABLED = "disabled";
    private static final String API_KEY_MASK_PREFIX = "••••";

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

        // Validate the submitted payload on its own terms first (unrelated to any persisted state or
        // bootstrap properties) so a bad reasoningEffort/thinkingMode/temperature etc. always reports
        // its own specific error - apiKey isn't touched by this validation, so it's safe to resolve
        // afterwards.
        AiRuntimeConfig next = normalizeAndValidate(fromDto(request));

        AiRuntimeConfig previous = refreshFromRedisOrDefaults();
        applyApiKeySemantics(next, previous, request);

        next = mergeBootstrapProviders(next, propertyDefaults());
        cachedConfig = next;
        writeToRedis(next);
        return toDto(next);
    }

    /**
     * Applies the write-side secret contract documented on {@link AiModelProviderConfigDto}:
     * clearApiKey=true clears it; a non-blank apiKey sets/replaces it; a blank/absent apiKey leaves
     * whatever was already persisted for that key untouched. Must run before normalizeAndValidate so
     * the resolved apiKey participates in normal validation/persistence like any other field.
     */
    private void applyApiKeySemantics(AiRuntimeConfig incoming, AiRuntimeConfig previous, AiModelConfigDto request) {
        if (incoming.getProviders() == null) {
            return;
        }

        Map<String, Boolean> clearFlags = new LinkedHashMap<>();
        if (request.providers() != null) {
            for (AiModelProviderConfigDto dto : request.providers()) {
                if (dto != null && hasText(dto.key())) {
                    clearFlags.put(dto.key().trim(), dto.clearApiKey());
                }
            }
        }

        for (AiRuntimeConfig.ProviderConfig provider : incoming.getProviders().values()) {
            String key = hasText(provider.getKey()) ? provider.getKey().trim() : null;
            if (key == null) {
                continue;
            }

            if (Boolean.TRUE.equals(clearFlags.get(key))) {
                provider.setApiKey(null);
                continue;
            }

            boolean looksLikeOwnMask = looksLikeMaskedPlaceholder(provider.getApiKey());
            if (looksLikeOwnMask) {
                // A well-behaved client never sends this back (apiKeyMasked is output-only), but a
                // frontend bug echoing the GET response's masked value into a PUT must never clobber
                // the real secret with the placeholder text - treat it exactly like "no value sent".
                log.warn("[AI Config] Ignoring apiKey for {} that looks like our own masked placeholder (client should never round-trip apiKeyMasked into apiKey) - leaving stored secret unchanged", key);
            }

            if (!hasText(provider.getApiKey()) || looksLikeOwnMask) {
                AiRuntimeConfig.ProviderConfig previousProvider = previous.provider(key);
                provider.setApiKey(previousProvider != null ? previousProvider.getApiKey() : null);
            }
            // else: a real non-blank secret was submitted - this IS the update, keep it as-is.
        }
    }

    private boolean looksLikeMaskedPlaceholder(String apiKey) {
        return apiKey != null && apiKey.startsWith(API_KEY_MASK_PREFIX);
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
            target.setThinkingMode(source.getThinkingMode());
            target.setReasoningEffort(source.getReasoningEffort());

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
                provider.setThinkingMode(providerDto.thinkingMode());
                provider.setReasoningEffort(providerDto.reasoningEffort());
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
            boolean hasApiKey = hasText(provider.getApiKey());
            providers.add(new AiModelProviderConfigDto(
                    provider.getKey(),
                    provider.getDisplayName(),
                    provider.getAdapter(),
                    provider.isEnabled(),
                    provider.getModel(),
                    provider.getBaseUrl(),
                    null, // apiKey is never serialized back to a client - see the DTO's javadoc
                    hasApiKey,
                    maskApiKey(provider.getApiKey()),
                    false, // clearApiKey is input-only
                    provider.getLocalProviderType(),
                    provider.getChatEndpoint(),
                    provider.getTimeoutMs(),
                    provider.getRetryCount(),
                    provider.getCooldownSeconds(),
                    provider.getTemperature(),
                    provider.getMaxOutputTokens(),
                    provider.getThinkingMode(),
                    provider.getReasoningEffort(),
                    computeStatus(provider, hasApiKey),
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

    /** Shows only enough of the key to recognize it (last 4 chars); never enough to reuse it. */
    private String maskApiKey(String apiKey) {
        if (!hasText(apiKey)) {
            return null;
        }
        String trimmed = apiKey.trim();
        if (trimmed.length() <= 4) {
            return API_KEY_MASK_PREFIX;
        }
        return API_KEY_MASK_PREFIX + trimmed.substring(trimmed.length() - 4);
    }

    private boolean needsApiKey(String adapter) {
        return !ADAPTER_OLLAMA.equals(adapter);
    }

    /**
     * Computed, read-only status surfaced on the existing admin config GET response (no separate
     * health endpoint exists in this service). MISSING_CREDENTIAL is derived purely from persisted
     * config (enabled + no stored key for an adapter that needs one) rather than from
     * ProviderStateManager's in-memory call history, so it's accurate even for a provider that has
     * never been called yet.
     */
    private String computeStatus(AiRuntimeConfig.ProviderConfig provider, boolean hasApiKey) {
        if (!provider.isEnabled()) {
            return "DISABLED";
        }
        if (needsApiKey(provider.getAdapter()) && !hasApiKey) {
            return "MISSING_CREDENTIAL";
        }
        return "READY";
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

            if (ADAPTER_DEEPSEEK.equals(adapter)) {
                normalizeDeepSeekReasoning(key, target, source);
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
        if (lowerKey.contains("deepseek")) {
            return ADAPTER_DEEPSEEK;
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
        if (lowerBaseUrl.contains("api.deepseek.com")) {
            return ADAPTER_DEEPSEEK;
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
            case "deepseek" -> ADAPTER_DEEPSEEK;
            default -> normalized;
        };
    }

    private void normalizeDeepSeekReasoning(String key, AiRuntimeConfig.ProviderConfig target, AiRuntimeConfig.ProviderConfig source) {
        String rawThinkingMode = source != null ? source.getThinkingMode() : null;
        String thinkingMode = hasText(rawThinkingMode) ? rawThinkingMode.trim().toLowerCase(Locale.ROOT) : THINKING_DISABLED;
        if (!THINKING_ENABLED.equals(thinkingMode) && !THINKING_DISABLED.equals(thinkingMode)) {
            throw new IllegalArgumentException("thinkingMode must be 'enabled' or 'disabled' for " + key + ": " + rawThinkingMode);
        }
        target.setThinkingMode(thinkingMode);

        String rawReasoningEffort = source != null ? source.getReasoningEffort() : null;
        String reasoningEffort = hasText(rawReasoningEffort) ? rawReasoningEffort.trim().toLowerCase(Locale.ROOT) : null;
        if (reasoningEffort != null && !REASONING_EFFORT_VALUES.contains(reasoningEffort)) {
            throw new IllegalArgumentException("reasoningEffort must be 'high' or 'max' for " + key + ": " + rawReasoningEffort);
        }
        target.setReasoningEffort(THINKING_ENABLED.equals(thinkingMode) ? reasoningEffort : null);

        if (THINKING_DISABLED.equals(thinkingMode) && target.getTemperature() != null
                && (target.getTemperature() < 0 || target.getTemperature() > 2)) {
            throw new IllegalArgumentException("temperature must be between 0 and 2 for " + key + ": " + target.getTemperature());
        }
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
            case ADAPTER_DEEPSEEK -> "deepseek-v4-flash";
            default -> "openai/gpt-oss-120b";
        };
    }

    private String defaultBaseUrlFor(String adapter) {
        return switch (adapter) {
            case ADAPTER_GEMINI -> "https://generativelanguage.googleapis.com/v1beta";
            case ADAPTER_OPENROUTER -> "https://openrouter.ai/api/v1";
            case ADAPTER_OLLAMA -> "http://localhost:11434";
            case ADAPTER_GROQ -> "https://api.groq.com/openai/v1";
            case ADAPTER_DEEPSEEK -> "https://api.deepseek.com";
            default -> "https://api.groq.com/openai/v1";
        };
    }

    private int defaultTimeoutFor(String adapter) {
        return switch (adapter) {
            case ADAPTER_OLLAMA -> 15000;
            case ADAPTER_OPENROUTER -> 10000;
            case ADAPTER_DEEPSEEK -> 30000;
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

    /**
     * Ollama's connection info (base URL, model, endpoint...) is infra-owned - it describes which
     * localhost/network instance is reachable in THIS environment, not an admin preference - so it is
     * force-refreshed from application.yml/env on every read even if a Redis-cached entry already
     * exists. Every other adapter's fields are admin-owned once persisted (see mergeBootstrapProviders).
     */
    private boolean shouldSyncBootstrapConnection(AiRuntimeConfig.ProviderConfig bootstrapProvider) {
        return bootstrapProvider != null && ADAPTER_OLLAMA.equals(bootstrapProvider.getAdapter());
    }

    /**
     * Any provider defined in application.yml (ai.providers.*) is eligible to be added to the
     * runtime config if it's missing from Redis - this is what makes newly-deployed bootstrap
     * providers (e.g. deepseekFast/deepseekPro) appear automatically for already-provisioned
     * environments without an admin having to add them by hand. This only ever ADDS a missing key;
     * it never touches the fields of a provider that already exists in Redis (that's admin-owned
     * state - see mergeBootstrapProviders and shouldSyncBootstrapConnection for the one exception).
     */
    private boolean shouldBootstrapProvider(AiRuntimeConfig.ProviderConfig bootstrapProvider) {
        return bootstrapProvider != null;
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
