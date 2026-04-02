package com.mysticai.orchestrator.dto.admin;

import java.util.Map;

public record AiModelProviderConfigDto(
        String key,
        String displayName,
        String adapter,
        boolean enabled,
        String model,
        String baseUrl,
        String apiKey,
        String localProviderType,
        String chatEndpoint,
        int timeoutMs,
        int retryCount,
        int cooldownSeconds,
        Double temperature,
        Integer maxOutputTokens,
        Map<String, String> headers
) {
}
