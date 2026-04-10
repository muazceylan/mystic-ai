package com.mysticai.orchestrator.service;

import com.mysticai.orchestrator.config.AiRuntimeConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
public class AiFallbackService {

    private static final Logger log = LoggerFactory.getLogger(AiFallbackService.class);
    private static final int RAW_SNIPPET_LIMIT = 500;

    private final AiModelConfigService configService;
    private final AiProviderRuntimeInvoker providerInvoker;
    private final FailureClassifier failureClassifier;
    private final ProviderStateManager stateManager;
    private final MockInterpretationService mockService;

    public AiFallbackService(
            AiModelConfigService configService,
            AiProviderRuntimeInvoker providerInvoker,
            FailureClassifier failureClassifier,
            ProviderStateManager stateManager,
            MockInterpretationService mockService
    ) {
        this.configService = configService;
        this.providerInvoker = providerInvoker;
        this.failureClassifier = failureClassifier;
        this.stateManager = stateManager;
        this.mockService = mockService;
    }

    public String generate(String prompt, boolean complex) {
        AiRuntimeConfig runtimeConfig = configService.getRuntimeConfigSnapshot();

        String chainName = complex ? "complex" : "simple";
        List<String> configuredChain = complex
                ? runtimeConfig.getComplexChain()
                : runtimeConfig.getSimpleChain();

        log.info("[AI Chain] Selected chain={} providers={}", chainName, configuredChain);

        if (configuredChain == null || configuredChain.isEmpty()) {
            log.warn("[AI Chain] Configured chain={} is empty", chainName);
            return fallbackOrThrow(prompt, runtimeConfig.isAllowMock());
        }

        for (int providerIndex = 0; providerIndex < configuredChain.size(); providerIndex++) {
            String providerKey = configuredChain.get(providerIndex);
            AiRuntimeConfig.ProviderConfig providerConfig = runtimeConfig.provider(providerKey);

            if (providerConfig == null) {
                log.warn("[AI Chain] Unknown provider key '{}' in chain={} - skipping", providerKey, chainName);
                continue;
            }

            if (!providerConfig.isEnabled()) {
                log.info("[AI Chain] Skipping {} because provider is disabled", providerKey);
                continue;
            }

            if (stateManager.isCooldownActive(providerKey)) {
                long remaining = stateManager.remainingCooldownSeconds(providerKey);
                log.info("[AI Chain] Skipping {} because cooldown active for {}s", providerKey, remaining);
                continue;
            }

            int maxAttempt = Math.max(providerConfig.getRetryCount(), 0);
            for (int attempt = 0; attempt <= maxAttempt; attempt++) {
                long startNanos = System.nanoTime();
                try {
                    log.info("[AI Chain] Trying provider [{}/{}]: {} model={} retryAttempt={}",
                            providerIndex + 1,
                            configuredChain.size(),
                            providerConfig.getDisplayName(),
                            providerConfig.getModel(),
                            attempt);

                    String response = providerInvoker.generateResponse(providerConfig, prompt);
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
                    log.info("[AI Chain] Provider {} succeeded in {}ms model={}", providerKey, elapsedMs, providerConfig.getModel());
                    return response;
                } catch (Exception ex) {
                    long elapsedMs = elapsedMs(startNanos);
                    AiFailureType failureType = failureClassifier.classify(ex);
                    stateManager.markFailure(providerKey, failureType, providerConfig.getCooldownSeconds(), summarizeException(ex));
                    Instant cooldownUntil = stateManager.stateOf(providerKey).getDisabledUntil();

                    FailureLogContext context = extractFailureContext(ex);
                    log.warn("[AI Chain] Provider {} failed: {} model={} retryAttempt={} elapsedMs={} statusCode={} contentType={} rawSnippet={} cooldownUntil={} reason={}",
                            providerKey,
                            failureType,
                            providerConfig.getModel(),
                            attempt,
                            elapsedMs,
                            context.statusCode(),
                            context.contentType(),
                            context.rawSnippet(),
                            cooldownUntil,
                            summarizeException(ex));

                    if (isLocalAdapter(providerConfig)
                            && (failureType == AiFailureType.TIMEOUT || failureType == AiFailureType.CONNECTION_ERROR)) {
                        log.warn("[AI Chain] Local LLM unavailable, continuing to next provider");
                        break;
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

        return fallbackOrThrow(prompt, runtimeConfig.isAllowMock());
    }

    private boolean isLocalAdapter(AiRuntimeConfig.ProviderConfig providerConfig) {
        String adapter = providerConfig.getAdapter();
        if (adapter == null) {
            return false;
        }
        return adapter.trim().toLowerCase(Locale.ROOT).equals(AiModelConfigService.ADAPTER_OLLAMA);
    }

    private String fallbackOrThrow(String prompt, boolean allowMock) {
        if (allowMock) {
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
