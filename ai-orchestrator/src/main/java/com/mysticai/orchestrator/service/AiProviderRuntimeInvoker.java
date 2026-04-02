package com.mysticai.orchestrator.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.orchestrator.config.AiRuntimeConfig;
import com.mysticai.orchestrator.provider.GeminiProvider;
import com.mysticai.orchestrator.provider.GroqProvider;
import com.mysticai.orchestrator.provider.LocalLlmProvider;
import com.mysticai.orchestrator.provider.OpenRouterProvider;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Map;

@Service
public class AiProviderRuntimeInvoker {

    private final ObjectMapper objectMapper;

    public AiProviderRuntimeInvoker(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String generateResponse(AiRuntimeConfig.ProviderConfig provider, String prompt) {
        if (provider == null) {
            throw new ProviderCallException(
                    "Provider config is missing",
                    AiFailureType.BAD_REQUEST,
                    null,
                    null,
                    null,
                    null
            );
        }

        String key = hasText(provider.getKey()) ? provider.getKey() : "unknown";
        String adapter = normalizeAdapter(provider.getAdapter());

        return switch (adapter) {
            case AiModelConfigService.ADAPTER_GEMINI -> new GeminiProvider(
                    key,
                    defaultDisplayName(provider, "Gemini"),
                    provider.getApiKey(),
                    fallback(provider.getModel(), "gemini-2.5-flash"),
                    fallback(provider.getBaseUrl(), "https://generativelanguage.googleapis.com/v1beta"),
                    safeTimeout(provider.getTimeoutMs(), 8000),
                    provider.getMaxOutputTokens(),
                    provider.getTemperature(),
                    safeHeaders(provider.getHeaders()),
                    objectMapper
            ).generateResponse(prompt);
            case AiModelConfigService.ADAPTER_GROQ -> new GroqProvider(
                    key,
                    defaultDisplayName(provider, "Groq"),
                    provider.getApiKey(),
                    fallback(provider.getModel(), "openai/gpt-oss-120b"),
                    fallback(provider.getBaseUrl(), "https://api.groq.com/openai/v1"),
                    safeTimeout(provider.getTimeoutMs(), 8000),
                    provider.getMaxOutputTokens(),
                    provider.getTemperature(),
                    safeHeaders(provider.getHeaders()),
                    objectMapper
            ).generateResponse(prompt);
            case AiModelConfigService.ADAPTER_OPENROUTER -> new OpenRouterProvider(
                    key,
                    defaultDisplayName(provider, "OpenRouter"),
                    provider.getApiKey(),
                    fallback(provider.getModel(), "openrouter/auto"),
                    fallback(provider.getBaseUrl(), "https://openrouter.ai/api/v1"),
                    safeTimeout(provider.getTimeoutMs(), 10000),
                    provider.getMaxOutputTokens(),
                    provider.getTemperature(),
                    safeHeaders(provider.getHeaders()),
                    objectMapper
            ).generateResponse(prompt);
            case AiModelConfigService.ADAPTER_OLLAMA -> new LocalLlmProvider(
                    key,
                    fallback(provider.getLocalProviderType(), "ollama"),
                    fallback(provider.getModel(), "gemma3:4b"),
                    fallback(provider.getBaseUrl(), "http://localhost:11434"),
                    fallback(provider.getChatEndpoint(), "/api/generate"),
                    safeTimeout(provider.getTimeoutMs(), 15000),
                    provider.getTemperature(),
                    provider.getMaxOutputTokens(),
                    safeHeaders(provider.getHeaders()),
                    objectMapper
            ).generateResponse(prompt);
            default -> throw new ProviderCallException(
                    "[" + key + "] unsupported provider adapter: " + adapter,
                    AiFailureType.BAD_REQUEST,
                    null,
                    null,
                    null,
                    null
            );
        };
    }

    private String normalizeAdapter(String raw) {
        if (!hasText(raw)) {
            return AiModelConfigService.ADAPTER_GROQ;
        }
        String value = raw.trim().toLowerCase(Locale.ROOT);
        return switch (value) {
            case "google", "gemini" -> AiModelConfigService.ADAPTER_GEMINI;
            case "openrouter" -> AiModelConfigService.ADAPTER_OPENROUTER;
            case "local", "local-llm", "localllm", "ollama" -> AiModelConfigService.ADAPTER_OLLAMA;
            default -> value;
        };
    }

    private Map<String, String> safeHeaders(Map<String, String> headers) {
        return headers == null ? Map.of() : headers;
    }

    private int safeTimeout(int timeoutMs, int fallback) {
        return timeoutMs > 0 ? timeoutMs : fallback;
    }

    private String fallback(String value, String fallback) {
        return hasText(value) ? value.trim() : fallback;
    }

    private String defaultDisplayName(AiRuntimeConfig.ProviderConfig provider, String fallback) {
        return hasText(provider.getDisplayName()) ? provider.getDisplayName() : fallback;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
