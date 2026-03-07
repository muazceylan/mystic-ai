package com.mysticai.orchestrator.service;

import com.mysticai.orchestrator.config.AiOrchestrationProperties;
import com.mysticai.orchestrator.provider.AiModelProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiFallbackService {

    private static final Logger log = LoggerFactory.getLogger(AiFallbackService.class);
    private static final String LOCAL_LLM_KEY = "localLlm";
    private static final int RAW_SNIPPET_LIMIT = 500;

    private final Map<String, AiModelProvider> providerRegistry;
    private final AiOrchestrationProperties properties;
    private final FailureClassifier failureClassifier;
    private final ProviderStateManager stateManager;
    private final MockInterpretationService mockService;

    public AiFallbackService(
            List<AiModelProvider> providers,
            AiOrchestrationProperties properties,
            FailureClassifier failureClassifier,
            ProviderStateManager stateManager,
            MockInterpretationService mockService
    ) {
        this.properties = properties;
        this.failureClassifier = failureClassifier;
        this.stateManager = stateManager;
        this.mockService = mockService;
        this.providerRegistry = buildProviderRegistry(providers);
    }

    public String generate(String prompt, boolean complex) {
        String chainName = complex ? "complex" : "simple";
        List<String> configuredChain = complex
                ? properties.getFallback().getChains().getComplex()
                : properties.getFallback().getChains().getSimple();

        List<AiModelProvider> resolvedChain = resolveChain(chainName, configuredChain);
        if (resolvedChain.isEmpty()) {
            log.warn("[AI Chain] Resolved chain={} is empty", chainName);
            return fallbackOrThrow(prompt);
        }

        for (int providerIndex = 0; providerIndex < resolvedChain.size(); providerIndex++) {
            AiModelProvider provider = resolvedChain.get(providerIndex);
            String providerKey = provider.providerKey();
            AiOrchestrationProperties.ProviderProperties providerProperties = properties.provider(providerKey);

            if (!providerProperties.isEnabled()) {
                log.info("[AI Chain] Skipping {} because provider is disabled in config", providerKey);
                continue;
            }

            if (stateManager.isCooldownActive(providerKey)) {
                long remaining = stateManager.remainingCooldownSeconds(providerKey);
                log.info("[AI Chain] Skipping {} because cooldown active for {}s", providerKey, remaining);
                continue;
            }

            int maxAttempt = Math.max(providerProperties.getRetryCount(), 0);
            for (int attempt = 0; attempt <= maxAttempt; attempt++) {
                long startNanos = System.nanoTime();
                try {
                    log.info("[AI Chain] Trying provider [{}/{}]: {} retryAttempt={}",
                            providerIndex + 1,
                            resolvedChain.size(),
                            provider.getName(),
                            attempt);

                    String response = provider.generateResponse(prompt);
                    long elapsedMs = elapsedMs(startNanos);

                    if (response == null || response.isBlank()) {
                        throw new ProviderCallException(
                                "[" + providerKey + "] empty response",
                                AiFailureType.EMPTY_RESPONSE,
                                null,
                                null,
                                null,
                                null
                        );
                    }

                    stateManager.markSuccess(providerKey);
                    log.info("[AI Chain] Provider {} succeeded in {}ms model={}", providerKey, elapsedMs, provider.modelId());
                    return response;
                } catch (Exception ex) {
                    long elapsedMs = elapsedMs(startNanos);
                    AiFailureType failureType = failureClassifier.classify(ex);
                    stateManager.markFailure(providerKey, failureType, providerProperties.getCooldownSeconds(), summarizeException(ex));
                    Instant cooldownUntil = stateManager.stateOf(providerKey).getDisabledUntil();

                    FailureLogContext context = extractFailureContext(ex);
                    log.warn("[AI Chain] Provider {} failed: {} model={} retryAttempt={} elapsedMs={} statusCode={} contentType={} rawSnippet={} cooldownUntil={} reason={}",
                            providerKey,
                            failureType,
                            provider.modelId(),
                            attempt,
                            elapsedMs,
                            context.statusCode(),
                            context.contentType(),
                            context.rawSnippet(),
                            cooldownUntil,
                            summarizeException(ex));

                    if (LOCAL_LLM_KEY.equals(providerKey)
                            && (failureType == AiFailureType.TIMEOUT || failureType == AiFailureType.CONNECTION_ERROR)) {
                        log.warn("[AI Chain] Local LLM unavailable, falling back to mock");
                        return fallbackOrThrow(prompt);
                    }

                    boolean shouldRetryAfterEmpty = failureType == AiFailureType.EMPTY_RESPONSE
                            && attempt < maxAttempt
                            && attempt < 1;
                    if (shouldRetryAfterEmpty) {
                        log.warn("[AI Chain] Provider {} retrying after EMPTY_RESPONSE attempt={}", providerKey, attempt + 1);
                        continue;
                    }

                    boolean hasMoreAttempts = attempt < maxAttempt;
                    if (hasMoreAttempts && failureClassifier.isRetryable(failureType)) {
                        continue;
                    }
                    break;
                }
            }
        }

        return fallbackOrThrow(prompt);
    }

    private Map<String, AiModelProvider> buildProviderRegistry(List<AiModelProvider> providers) {
        Map<String, AiModelProvider> registry = new LinkedHashMap<>();
        for (AiModelProvider provider : providers) {
            AiModelProvider previous = registry.put(provider.providerKey(), provider);
            if (previous != null) {
                log.warn("[AI Chain] Duplicate providerKey detected: {}. Last bean wins.", provider.providerKey());
            }
        }
        return registry;
    }

    private List<AiModelProvider> resolveChain(String chainName, List<String> configuredChain) {
        List<String> chainKeys = configuredChain == null ? List.of() : configuredChain;
        log.info("[AI Chain] Selected chain={} providers={}", chainName, chainKeys);

        List<AiModelProvider> resolved = new ArrayList<>();
        for (String key : chainKeys) {
            AiModelProvider provider = providerRegistry.get(key);
            if (provider == null) {
                log.warn("[AI Chain] Unknown provider key '{}' in chain={} - skipping", key, chainName);
                continue;
            }
            resolved.add(provider);
        }

        return resolved;
    }

    private String fallbackOrThrow(String prompt) {
        if (properties.getFallback().isAllowMock()) {
            log.warn("[AI Chain] All providers exhausted, using mock fallback");
            return mockService.generateFallback(prompt);
        }

        throw new IllegalStateException("All AI providers failed and mock fallback is disabled");
    }

    private long elapsedMs(long startedAtNanos) {
        return (System.nanoTime() - startedAtNanos) / 1_000_000;
    }

    private String summarizeException(Throwable throwable) {
        if (throwable == null) {
            return "unknown";
        }
        String message = throwable.getMessage();
        if (message != null && !message.isBlank()) {
            return message;
        }
        return throwable.getClass().getSimpleName();
    }

    private FailureLogContext extractFailureContext(Throwable throwable) {
        Integer statusCode = null;
        String contentType = null;
        String rawSnippet = null;

        Throwable current = throwable;
        while (current != null) {
            if (current instanceof ProviderCallException pce) {
                if (statusCode == null) {
                    statusCode = pce.getStatusCode();
                }
                if (contentType == null) {
                    contentType = pce.getContentType();
                }
                if (rawSnippet == null) {
                    rawSnippet = shortenSnippet(pce.getRawSnippet());
                }
            }

            if (current instanceof RestClientResponseException ex) {
                if (statusCode == null) {
                    statusCode = ex.getStatusCode().value();
                }
                if (contentType == null && ex.getResponseHeaders() != null && ex.getResponseHeaders().getContentType() != null) {
                    contentType = ex.getResponseHeaders().getContentType().toString();
                }
                if (rawSnippet == null) {
                    rawSnippet = shortenSnippet(ex.getResponseBodyAsString());
                }
            }

            current = current.getCause();
        }

        return new FailureLogContext(statusCode, contentType, rawSnippet);
    }

    private String shortenSnippet(String value) {
        if (value == null) {
            return null;
        }
        String singleLine = value.replaceAll("\\s+", " ").trim();
        if (singleLine.length() <= RAW_SNIPPET_LIMIT) {
            return singleLine;
        }
        return singleLine.substring(0, RAW_SNIPPET_LIMIT);
    }

    private record FailureLogContext(Integer statusCode, String contentType, String rawSnippet) {
    }
}
