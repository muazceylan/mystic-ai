package com.mysticai.orchestrator.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.orchestrator.provider.AiModelProvider;
import com.mysticai.orchestrator.provider.GeminiProvider;
import com.mysticai.orchestrator.provider.GroqProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Registers AI model provider beans that feed into the AiFallbackService chain.
 *
 * Fallback chain for complex tasks (natal chart, dreams, monthly story):
 *   [0] Groq llama-3.3-70b-versatile  — Best quality
 *   [1] Gemini 1.5 Flash              — High RPM free tier
 *   [2] Groq mixtral-8x7b-32768       — Fast & reliable
 *   [3] Groq llama-3.1-8b-instant     — Extremely fast, highest limits
 *
 * For simple tasks (SWOT, symbol meaning, sky pulse):
 *   [0] Groq llama-3.1-8b-instant     — fastest first (saves tokens)
 *   [1] Gemini 1.5 Flash
 *   [2] Groq mixtral-8x7b-32768
 *
 * All API keys and model IDs are externalized to application.yml.
 */
@Configuration
public class AiProviderConfig {

    @Value("${ai.groq.api-key}")
    private String groqApiKey;

    @Value("${ai.groq.base-url}")
    private String groqBaseUrl;

    @Value("${ai.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${ai.gemini.base-url}")
    private String geminiBaseUrl;

    @Value("${ai.gemini.model}")
    private String geminiModel;

    // ── Groq providers ────────────────────────────────────────────────

    /** Primary: highest quality, used first for complex tasks. */
    @Bean("groqPrimary")
    public AiModelProvider groqPrimary(ObjectMapper objectMapper) {
        return new GroqProvider(
                "Groq/llama-3.3-70b-versatile",
                groqApiKey,
                "llama-3.3-70b-versatile",
                groqBaseUrl,
                2048,
                objectMapper
        );
    }

    /** Tertiary: faster model, mid-tier quality fallback. */
    @Bean("groqMixtral")
    public AiModelProvider groqMixtral(ObjectMapper objectMapper) {
        return new GroqProvider(
                "Groq/mixtral-8x7b-32768",
                groqApiKey,
                "mixtral-8x7b-32768",
                groqBaseUrl,
                2048,
                objectMapper
        );
    }

    /** Quaternary / simple-primary: fastest model, very high rate limits. */
    @Bean("groqFast")
    public AiModelProvider groqFast(ObjectMapper objectMapper) {
        return new GroqProvider(
                "Groq/llama-3.1-8b-instant",
                groqApiKey,
                "llama-3.1-8b-instant",
                groqBaseUrl,
                1024,
                objectMapper
        );
    }

    // ── Google Gemini ──────────────────────────────────────────────────

    /** Secondary: Google Gemini 1.5 Flash — high RPM free tier. */
    @Bean("geminiFlash")
    public AiModelProvider geminiFlash(ObjectMapper objectMapper) {
        return new GeminiProvider(
                "Gemini/1.5-flash",
                geminiApiKey,
                geminiModel,
                geminiBaseUrl,
                objectMapper
        );
    }
}
