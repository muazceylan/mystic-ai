package com.mysticai.orchestrator.service;

import com.mysticai.orchestrator.provider.AiModelProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Intelligent AI fallback service that rotates through a prioritized provider chain.
 *
 * On rate limit (429) or any error, it logs the failure and advances to the next provider.
 * If all providers fail, falls back to MockInterpretationService (pre-written Turkish text).
 *
 * Two chains:
 *   - complexChain: 70B → Gemini Flash → Mixtral → 8B (best quality first)
 *   - simpleChain:  8B  → Gemini Flash → Mixtral    (fastest first, saves tokens)
 */
@Service
public class AiFallbackService {

    private static final Logger log = LoggerFactory.getLogger(AiFallbackService.class);

    private final List<AiModelProvider> complexChain;
    private final List<AiModelProvider> simpleChain;
    private final MockInterpretationService mockService;
    private final boolean allowMockFallback;

    public AiFallbackService(
            @Qualifier("groqPrimary")  AiModelProvider groqPrimary,
            @Qualifier("geminiFlash")  AiModelProvider geminiFlash,
            @Qualifier("groqMixtral") AiModelProvider groqMixtral,
            @Qualifier("groqFast")     AiModelProvider groqFast,
            @Value("${ai.chain.complex:groqPrimary,geminiFlash,groqMixtral,groqFast}") List<String> complexOrder,
            @Value("${ai.chain.simple:groqFast,geminiFlash,groqMixtral}") List<String> simpleOrder,
            @Value("${ai.fallback.allow-mock:true}") boolean allowMockFallback,
            MockInterpretationService mockService) {
        Map<String, AiModelProvider> providers = new LinkedHashMap<>();
        providers.put("groqPrimary", groqPrimary);
        providers.put("geminiFlash", geminiFlash);
        providers.put("groqMixtral", groqMixtral);
        providers.put("groqFast", groqFast);

        this.complexChain = resolveChain("complex", complexOrder, providers,
                List.of("groqPrimary", "geminiFlash", "groqMixtral", "groqFast"));
        this.simpleChain = resolveChain("simple", simpleOrder, providers,
                List.of("groqFast", "geminiFlash", "groqMixtral"));

        this.allowMockFallback = allowMockFallback;
        this.mockService = mockService;
    }

    /**
     * Generates a response by walking the provider chain for the given complexity level.
     *
     * @param prompt  the fully-built prompt string
     * @param complex true = natal charts / dreams / monthly story; false = SWOT / sky pulse / symbol
     * @return AI response text (never null)
     */
    public String generate(String prompt, boolean complex) {
        List<AiModelProvider> chain = complex ? complexChain : simpleChain;

        for (int i = 0; i < chain.size(); i++) {
            AiModelProvider provider = chain.get(i);
            try {
                log.info("[AI Chain] Trying provider [{}/{}]: {}",
                        i + 1, chain.size(), provider.getName());

                String response = provider.generateResponse(prompt);

                if (response != null && !response.isBlank()) {
                    log.info("[AI Chain] Success: {} ({} chars)", provider.getName(), response.length());
                    return response;
                }
                log.warn("[AI Chain] {} returned empty response — advancing chain", provider.getName());

            } catch (Exception e) {
                String reason = classifyError(e);
                String nextProvider = (i + 1 < chain.size())
                        ? chain.get(i + 1).getName()
                        : "local mock";

                log.warn("[AI Chain] {} failed [{}]: {}. Switching to {}...",
                        provider.getName(), reason, extractMessage(e), nextProvider);
            }
        }

        if (!allowMockFallback) {
            log.error("[AI Chain] All {} providers exhausted and mock fallback is disabled", chain.size());
            throw new IllegalStateException("All AI providers failed and mock fallback is disabled");
        }

        log.error("[AI Chain] All {} providers exhausted — using local mock fallback", chain.size());
        return mockService.generateFallback(prompt);
    }

    private List<AiModelProvider> resolveChain(
            String chainName,
            List<String> configuredOrder,
            Map<String, AiModelProvider> providers,
            List<String> defaultOrder) {

        List<String> order = (configuredOrder == null || configuredOrder.isEmpty())
                ? defaultOrder
                : configuredOrder;

        List<AiModelProvider> resolved = new ArrayList<>();
        for (String key : order) {
            AiModelProvider provider = providers.get(key);
            if (provider == null) {
                log.warn("[AI Chain] Unknown provider key '{}' in ai.chain.{} — skipping", key, chainName);
                continue;
            }
            resolved.add(provider);
        }

        if (resolved.isEmpty()) {
            log.warn("[AI Chain] Resolved {} chain is empty, falling back to defaults: {}", chainName, defaultOrder);
            for (String key : defaultOrder) {
                AiModelProvider provider = providers.get(key);
                if (provider != null) {
                    resolved.add(provider);
                }
            }
        }

        log.info("[AI Chain] {} order: {}", chainName, order);
        return resolved;
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private String classifyError(Exception e) {
        if (isRateLimit(e)) return "Rate Limit / Quota";
        if (isTimeout(e))   return "Timeout";
        return "Error";
    }

    private boolean isRateLimit(Exception e) {
        Throwable t = e;
        while (t != null) {
            if (t instanceof HttpClientErrorException ex && ex.getStatusCode().value() == 429) {
                return true;
            }
            String msg = (t.getMessage() != null ? t.getMessage() : "").toLowerCase();
            if (msg.contains("429") || msg.contains("rate_limit") || msg.contains("quota")
                    || msg.contains("resource_exhausted") || msg.contains("too many")) {
                return true;
            }
            t = t.getCause();
        }
        return false;
    }

    private boolean isTimeout(Exception e) {
        Throwable t = e;
        while (t != null) {
            String cn = t.getClass().getSimpleName().toLowerCase();
            if (cn.contains("timeout") || cn.contains("sockettimeout")) return true;
            t = t.getCause();
        }
        return false;
    }

    private String extractMessage(Exception e) {
        if (e.getMessage() != null) return e.getMessage();
        if (e.getCause() != null && e.getCause().getMessage() != null) return e.getCause().getMessage();
        return e.getClass().getSimpleName();
    }
}
