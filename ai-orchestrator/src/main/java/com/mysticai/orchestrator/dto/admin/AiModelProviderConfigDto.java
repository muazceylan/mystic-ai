package com.mysticai.orchestrator.dto.admin;

import java.util.Map;

/**
 * Shared shape for both the admin GET response and the PUT update request - the two directions use
 * different subsets of the secret-related fields, which is why they look asymmetric:
 *
 * - apiKey: INPUT ONLY. On GET responses this is always null (the real secret is never serialized
 *   back to a client). On PUT requests: a non-blank value sets/replaces the stored secret; a blank
 *   or absent value leaves the existing stored secret untouched (see AiModelConfigService#update).
 * - hasApiKey / apiKeyMasked: OUTPUT ONLY, computed fresh on every GET; ignored if sent on a PUT.
 * - clearApiKey: INPUT ONLY. Set true on a PUT to explicitly remove a stored secret (the only way to
 *   clear one - sending a blank apiKey is defined as "leave unchanged", not "clear").
 * - status: OUTPUT ONLY, computed fresh on every GET (e.g. MISSING_CREDENTIAL); ignored if sent on a PUT.
 */
public record AiModelProviderConfigDto(
        String key,
        String displayName,
        String adapter,
        boolean enabled,
        String model,
        String baseUrl,
        String apiKey,
        boolean hasApiKey,
        String apiKeyMasked,
        boolean clearApiKey,
        String localProviderType,
        String chatEndpoint,
        int timeoutMs,
        int retryCount,
        int cooldownSeconds,
        Double temperature,
        Integer maxOutputTokens,
        String thinkingMode,
        String reasoningEffort,
        String status,
        Map<String, String> headers
) {
}
