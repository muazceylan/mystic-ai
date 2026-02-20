package com.mysticai.orchestrator.provider;

/**
 * Unified interface for AI model providers (Groq, Gemini, etc.).
 * Each implementation encapsulates a single model + API endpoint.
 * Throws RuntimeException on failure (including rate limits); the
 * AiFallbackService uses this to rotate to the next provider.
 */
public interface AiModelProvider {

    /** Human-readable name logged during fallback rotation. */
    String getName();

    /**
     * Calls the underlying AI model with the given prompt.
     *
     * @param prompt the full prompt string
     * @return non-blank response text from the model
     * @throws RuntimeException on rate limit (429), quota exhaustion, timeout, or any other error
     */
    String generateResponse(String prompt);
}
