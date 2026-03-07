package com.mysticai.orchestrator.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.orchestrator.provider.AiModelProvider;
import com.mysticai.orchestrator.provider.GeminiProvider;
import com.mysticai.orchestrator.provider.GroqProvider;
import com.mysticai.orchestrator.provider.LocalLlmProvider;
import com.mysticai.orchestrator.provider.OpenRouterProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AiOrchestrationProperties.class)
public class AiProviderConfig {

    private static final Logger log = LoggerFactory.getLogger(AiProviderConfig.class);

    private static final String GEMINI_KEY = "gemini";
    private static final String GROQ_PREMIUM_KEY = "groqPremium";
    private static final String GROQ_FAST_KEY = "groqFast";
    private static final String OPENROUTER_KEY = "openrouter";
    private static final String LOCAL_LLM_KEY = "localLlm";

    private static final String DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
    private static final String DEFAULT_GROQ_PREMIUM_MODEL = "openai/gpt-oss-120b";
    private static final String FIXED_GROQ_FAST_MODEL = "llama-3.1-8b-instant";
    private static final String DEFAULT_OPENROUTER_MODEL = "openrouter/auto";
    private static final String DEFAULT_LOCAL_LLM_MODEL = "gemma3:4b";

    @Bean
    public AiModelProvider geminiProvider(AiOrchestrationProperties properties, ObjectMapper objectMapper) {
        AiOrchestrationProperties.ProviderProperties p = properties.provider(GEMINI_KEY);

        String model = readOrDefault(p.getModel(), DEFAULT_GEMINI_MODEL);
        return new GeminiProvider(
                GEMINI_KEY,
                "Gemini",
                p.getApiKey(),
                model,
                readOrDefault(p.getBaseUrl(), "https://generativelanguage.googleapis.com/v1beta"),
                p.getTimeoutMs(),
                readIntOrDefault(p.getMaxOutputTokens(), 2048),
                readDoubleOrDefault(p.getTemperature(), 0.8),
                p.getHeaders(),
                objectMapper
        );
    }

    @Bean
    public AiModelProvider groqPremiumProvider(AiOrchestrationProperties properties, ObjectMapper objectMapper) {
        AiOrchestrationProperties.ProviderProperties p = properties.provider(GROQ_PREMIUM_KEY);

        String model = readOrDefault(p.getModel(), DEFAULT_GROQ_PREMIUM_MODEL);
        return new GroqProvider(
                GROQ_PREMIUM_KEY,
                "GroqPremium",
                p.getApiKey(),
                model,
                readOrDefault(p.getBaseUrl(), "https://api.groq.com/openai/v1"),
                p.getTimeoutMs(),
                readIntOrDefault(p.getMaxOutputTokens(), 2048),
                readDoubleOrDefault(p.getTemperature(), 0.8),
                p.getHeaders(),
                objectMapper
        );
    }

    @Bean
    public AiModelProvider groqFastProvider(AiOrchestrationProperties properties, ObjectMapper objectMapper) {
        AiOrchestrationProperties.ProviderProperties p = properties.provider(GROQ_FAST_KEY);

        String requestedModel = p.getModel();
        if (requestedModel != null && !requestedModel.isBlank() && !FIXED_GROQ_FAST_MODEL.equals(requestedModel)) {
            log.warn("[AI Config] groqFast model '{}' ignored, enforced model is '{}'", requestedModel, FIXED_GROQ_FAST_MODEL);
        }

        // groqFast is intentionally cheap/fast Turkish fallback, not premium long narrative model.
        return new GroqProvider(
                GROQ_FAST_KEY,
                "GroqFast",
                p.getApiKey(),
                FIXED_GROQ_FAST_MODEL,
                readOrDefault(p.getBaseUrl(), "https://api.groq.com/openai/v1"),
                p.getTimeoutMs(),
                readIntOrDefault(p.getMaxOutputTokens(), 1024),
                readDoubleOrDefault(p.getTemperature(), 0.7),
                p.getHeaders(),
                objectMapper
        );
    }

    @Bean
    public AiModelProvider openRouterProvider(AiOrchestrationProperties properties, ObjectMapper objectMapper) {
        AiOrchestrationProperties.ProviderProperties p = properties.provider(OPENROUTER_KEY);

        String model = readOrDefault(p.getModel(), DEFAULT_OPENROUTER_MODEL);
        return new OpenRouterProvider(
                OPENROUTER_KEY,
                "OpenRouter",
                p.getApiKey(),
                model,
                readOrDefault(p.getBaseUrl(), "https://openrouter.ai/api/v1"),
                p.getTimeoutMs(),
                readIntOrDefault(p.getMaxOutputTokens(), 2048),
                readDoubleOrDefault(p.getTemperature(), 0.8),
                p.getHeaders(),
                objectMapper
        );
    }

    @Bean
    public AiModelProvider localLlmProvider(AiOrchestrationProperties properties, ObjectMapper objectMapper) {
        AiOrchestrationProperties.ProviderProperties p = properties.provider(LOCAL_LLM_KEY);
        return new LocalLlmProvider(
                LOCAL_LLM_KEY,
                readOrDefault(p.getProviderType(), "ollama"),
                readOrDefault(p.getModel(), DEFAULT_LOCAL_LLM_MODEL),
                readOrDefault(p.getBaseUrl(), "http://localhost:11434"),
                readOrDefault(p.getChatEndpoint(), "/api/generate"),
                p.getTimeoutMs(),
                readDoubleOrDefault(p.getTemperature(), 0.7),
                readIntOrDefault(p.getMaxOutputTokens(), 1024),
                p.getHeaders(),
                objectMapper
        );
    }

    private String readOrDefault(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value;
    }

    private Integer readIntOrDefault(Integer value, Integer fallback) {
        return value == null ? fallback : value;
    }

    private Double readDoubleOrDefault(Double value, Double fallback) {
        return value == null ? fallback : value;
    }
}
