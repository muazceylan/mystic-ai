package com.mysticai.orchestrator.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.common.event.AiAnalysisEvent;
import com.mysticai.orchestrator.dto.OracleInterpretationRequest;
import com.mysticai.orchestrator.prompt.MysticalPromptTemplates;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Service for generating mystical AI interpretations.
 * Delegates all AI calls to AiFallbackService which rotates through:
 *   Groq 70B → Gemini Flash → Groq Mixtral → Groq 8B → local mock
 *
 * Smart complexity routing:
 *   - Complex prompts (natal chart, dreams, monthly story) → full chain starting with 70B
 *   - Simple prompts (SWOT tags, symbol meaning, sky pulse) → fast chain starting with 8B
 */
@Service
public class MysticalAiService {

    private static final Logger logger = LoggerFactory.getLogger(MysticalAiService.class);

    private final AiFallbackService fallbackService;
    private final MysticalPromptTemplates promptTemplates;
    private final ObjectMapper objectMapper;

    public MysticalAiService(AiFallbackService fallbackService,
                             MysticalPromptTemplates promptTemplates,
                             ObjectMapper objectMapper) {
        this.fallbackService = fallbackService;
        this.promptTemplates = promptTemplates;
        this.objectMapper = objectMapper;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Event-based interpretation (RabbitMQ)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Generates a mystical interpretation based on the RabbitMQ analysis event.
     * Routes to the appropriate complexity chain automatically.
     */
    public String generateInterpretation(AiAnalysisEvent event) {
        String prompt = buildPrompt(event);
        boolean complex = isComplexTask(event);

        logger.info("Generating interpretation for correlationId: {}, type: {}, complex: {}",
                event.correlationId(), event.analysisType(), complex);

        try {
            // Prepend a language instruction if the event payload specifies a locale.
            // This ensures the AI responds in the user's chosen language.
            String locale = extractFromPayload(event.payload(), "locale");
            boolean hasLocale = !"locale mevcut değil".equals(locale);
            if (hasLocale) {
                prompt = wrapWithLocale(prompt, locale);
            }

            String response = callAiModel(prompt, complex);

            // For types that must return a JSON object, extract the first {...} block.
            // This handles cases where the model echoes the output instructions ("Çıkış Kuralı:...")
            // before the actual JSON.
            if (expectsJsonResponse(event)) {
                response = extractJsonObject(response);
            }

            // Only normalize zodiac/planet names to Turkish when locale is Turkish.
            // For English responses, keep the original English terms.
            if (!hasLocale || "tr".equals(locale)) {
                response = replaceTurkishTerms(response);
            }

            logger.info("Interpretation generated for correlationId: {}, length: {}",
                    event.correlationId(), response.length());
            return response;
        } catch (Exception e) {
            logger.error("Interpretation failed for correlationId: {}", event.correlationId(), e);
            throw new RuntimeException("AI interpretation failed: " + e.getMessage(), e);
        }
    }

    /** Returns true for analysis types whose AI response must be a JSON object. */
    private boolean expectsJsonResponse(AiAnalysisEvent event) {
        if (event.analysisType() == null) return false;
        return switch (event.analysisType()) {
            case DREAM_SYNTHESIS, WEEKLY_SWOT, RELATIONSHIP_ANALYSIS -> true;
            default -> false;
        };
    }

    /**
     * True for tasks that need maximum quality (long, complex output).
     * False for tasks that benefit from speed (short, structured output).
     */
    private boolean isComplexTask(AiAnalysisEvent event) {
        if (event.analysisType() == null) return true;
        return switch (event.analysisType()) {
            case NATAL_CHART, DREAM_SYNTHESIS, MONTHLY_DREAM_STORY, LUCKY_DATES, PERIODIC,
                 RELATIONSHIP_ANALYSIS -> true;
            case SWOT, WEEKLY_SWOT, SYMBOL_MEANING, COLLECTIVE_PULSE_REASON -> false;
            default -> true;
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // Direct (synchronous) calls — called by InterpretationController
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Generates a personalized daily oracle synthesis.
     * Complex: uses full user context → needs best model.
     */
    public String generateOracleInterpretation(OracleInterpretationRequest request) {
        String prompt = promptTemplates.getOracleDailySecretPrompt(request);
        logger.info("Generating oracle for user: {}", request.name());
        try {
            String response = callAiModel(prompt, true);
            response = replaceTurkishTerms(response);
            logger.info("Oracle generated for: {}, length: {}", request.name(), response.length());
            return response;
        } catch (Exception e) {
            logger.error("Oracle generation failed for: {}", request.name(), e);
            throw new RuntimeException("Oracle AI interpretation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Extracts dream symbols — simple, expects JSON array.
     * Returns a JSON array string like ["Su", "Yılan", "Uçmak"].
     */
    public String extractDreamSymbols(String dreamText) {
        String prompt = """
                Sen bir rüya sembolü uzmanısın. Verilen rüya metninden en önemli 5-8 sembolik nesne,
                eylem veya kavramı çıkar. Bunlar somut imgeler olmalı (örn: "Su", "Yılan", "Uçmak", "Ev", "Ateş").

                RÜYA: %s

                SADECE JSON dizisi döndür, başka hiçbir şey yazma. Örnek: ["Su", "Yılan", "Uçmak"]
                Türkçe yaz. En fazla 8 sembol. Tekrar eden sembolleri bir kez yaz.
                """.formatted(dreamText.substring(0, Math.min(dreamText.length(), 500)));

        try {
            String response = callAiModel(prompt, false).trim();
            int start = response.indexOf('[');
            int end   = response.lastIndexOf(']');
            if (start != -1 && end != -1) return response.substring(start, end + 1);
            return "[]";
        } catch (Exception e) {
            logger.warn("Symbol extraction failed: {}", e.getMessage());
            return "[]";
        }
    }

    /**
     * Returns Jungian + astrological meaning for a dream symbol (simple task).
     * Returns JSON: {"universal":"...","psychological":"...","personal":"..."}
     */
    public String getSymbolMeaning(String symbolName, int userCount, String houseAssociation) {
        String prompt = promptTemplates.getSymbolMeaningPrompt(symbolName, userCount, houseAssociation);
        try {
            String response = callAiModel(prompt, false).trim();
            int start = response.indexOf('{');
            int end   = response.lastIndexOf('}');
            if (start != -1 && end != -1) return response.substring(start, end + 1);
            return "{\"universal\":\"\",\"psychological\":\"\",\"personal\":\"" + response + "\"}";
        } catch (Exception e) {
            logger.warn("Symbol meaning generation failed: {}", e.getMessage());
            return "{\"universal\":\"\",\"psychological\":\"\",\"personal\":\"\"}";
        }
    }

    /**
     * Generates astro reasoning for collective pulse top symbols (simple task).
     * Returns plain text (1-2 sentences).
     */
    public String getCollectivePulseReason(String topSymbols, String currentTransits) {
        String prompt = promptTemplates.getCollectivePulseAstroReasonPrompt(topSymbols, currentTransits);
        try {
            return callAiModel(prompt, false).trim();
        } catch (Exception e) {
            logger.warn("Collective pulse reason generation failed: {}", e.getMessage());
            return "Gökyüzündeki gezegenler bugün kolektif bilinçdışını harekete geçiriyor.";
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Internal prompt builder
    // ─────────────────────────────────────────────────────────────────────

    private String buildPrompt(AiAnalysisEvent event) {
        if (event.analysisType() == AiAnalysisEvent.AnalysisType.SWOT) {
            return promptTemplates.getSwotAnalysisPrompt(
                    extractFromPayload(event.payload(), "birthChart"),
                    extractFromPayload(event.payload(), "currentTransits"),
                    extractFromPayload(event.payload(), "question"));
        }
        if (event.analysisType() == AiAnalysisEvent.AnalysisType.PERIODIC) {
            return promptTemplates.getPeriodicAnalysisPrompt(
                    extractFromPayload(event.payload(), "sunSign"),
                    extractFromPayload(event.payload(), "moonSign"),
                    extractFromPayload(event.payload(), "period"),
                    extractFromPayload(event.payload(), "natalChart"));
        }
        if (event.analysisType() == AiAnalysisEvent.AnalysisType.NATAL_CHART) {
            return promptTemplates.getNatalChartInterpretationPrompt(event.payload());
        }
        if (event.analysisType() == AiAnalysisEvent.AnalysisType.LUCKY_DATES) {
            return promptTemplates.getLuckyDatesInterpretationPrompt(event.payload());
        }
        if (event.analysisType() == AiAnalysisEvent.AnalysisType.WEEKLY_SWOT) {
            return promptTemplates.getWeeklySwotPrompt(event.payload());
        }
        if (event.analysisType() == AiAnalysisEvent.AnalysisType.DREAM_SYNTHESIS) {
            return promptTemplates.getAstroDreamSynthesisPrompt(
                    extractFromPayload(event.payload(), "dreamText"),
                    extractFromPayload(event.payload(), "recurringSymbols"),
                    extractFromPayload(event.payload(), "moonSign"),
                    extractFromPayload(event.payload(), "risingSign"),
                    extractFromPayload(event.payload(), "twelfthHousePlanets"),
                    extractFromPayload(event.payload(), "neptuneTransit"),
                    extractFromPayload(event.payload(), "currentTransits"));
        }
        if (event.analysisType() == AiAnalysisEvent.AnalysisType.MONTHLY_DREAM_STORY) {
            return promptTemplates.getMonthlyDreamStoryPrompt(
                    extractFromPayload(event.payload(), "yearMonth"),
                    extractFromPayload(event.payload(), "dreamCount"),
                    extractFromPayload(event.payload(), "dreamsSummary"),
                    extractFromPayload(event.payload(), "dominantSymbols"),
                    extractFromPayload(event.payload(), "sunSign"),
                    extractFromPayload(event.payload(), "moonSign"),
                    extractFromPayload(event.payload(), "midMonthTransits"));
        }
        if (event.analysisType() == AiAnalysisEvent.AnalysisType.RELATIONSHIP_ANALYSIS) {
            return promptTemplates.getRelationshipAnalysisPrompt(
                    extractFromPayload(event.payload(), "userName"),
                    extractFromPayload(event.payload(), "userSunSign"),
                    extractFromPayload(event.payload(), "userMoonSign"),
                    extractFromPayload(event.payload(), "userRisingSign"),
                    extractFromPayload(event.payload(), "userPlanetsText"),
                    extractFromPayload(event.payload(), "partnerName"),
                    extractFromPayload(event.payload(), "partnerSunSign"),
                    extractFromPayload(event.payload(), "partnerMoonSign"),
                    extractFromPayload(event.payload(), "partnerRisingSign"),
                    extractFromPayload(event.payload(), "partnerPlanetsText"),
                    extractFromPayload(event.payload(), "relationshipType"),
                    extractFromPayload(event.payload(), "allAspectsText"));
        }
        return switch (event.sourceService()) {
            case DREAM     -> promptTemplates.getDreamInterpretationPrompt(
                                      extractDreamContent(event.payload()));
            case ASTROLOGY -> promptTemplates.getAstrologyInterpretationPrompt(event.payload());
            default        -> promptTemplates.getGenericInterpretationPrompt(event);
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // Core AI call — delegates to fallback chain
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Calls the fallback chain and strips any markdown fences from the response.
     * Note: Turkish term replacement is handled at a higher level (generateInterpretation)
     * to allow locale-aware skipping for English responses.
     *
     * @param complex true = use complex chain (70B first); false = use simple chain (8B first)
     */
    private String callAiModel(String prompt, boolean complex) {
        String response = fallbackService.generate(prompt, complex);
        return stripMarkdown(response);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Locale / Language instruction
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Prepends a language instruction to the prompt so the AI responds in the
     * user's preferred language.  Defaults to Turkish if locale is unknown.
     */
    private String wrapWithLocale(String prompt, String locale) {
        if ("en".equals(locale)) {
            return "IMPORTANT: Your entire response MUST be written in English. " +
                   "Do not use any other language in your response.\n\n" + prompt;
        }
        // Default / "tr"
        return "ÖNEMLİ: Yanıtının tamamını Türkçe yaz. Başka dil kullanma.\n\n" + prompt;
    }

    // ─────────────────────────────────────────────────────────────────────
    // JSON / Markdown sanitization
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Strips leading/trailing markdown code fences (```json ... ```, ``` ... ```)
     * that models sometimes emit even when explicitly told not to.
     */
    private String stripMarkdown(String response) {
        if (response == null) return "";
        String s = response.trim();
        if (s.startsWith("```")) {
            int firstNewline = s.indexOf('\n');
            s = firstNewline != -1
                    ? s.substring(firstNewline + 1).trim()
                    : s.substring(3).trim();
        }
        if (s.endsWith("```")) {
            s = s.substring(0, s.lastIndexOf("```")).trim();
        }
        return s;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Payload extraction helpers
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Extracts a value from a JSON payload by key using Jackson (handles commas in values).
     * Falls back to heuristic string extraction for non-JSON payloads.
     */
    private String extractFromPayload(String payload, String key) {
        if (payload == null || payload.isEmpty()) return key + " mevcut değil";
        try {
            JsonNode root = objectMapper.readTree(payload);
            JsonNode val  = root.get(key);
            if (val != null && !val.isNull()) {
                String text = val.asText().replace("\\n", "\n").trim();
                return text.isEmpty() ? key + " mevcut değil" : text;
            }
        } catch (Exception ignored) { /* fall through */ }

        // Heuristic fallback for plain-text (legacy) payloads
        String searchKey = "\"" + key + "\":";
        int keyIndex = payload.indexOf(searchKey);
        if (keyIndex == -1) { searchKey = "\"" + key + "\": "; keyIndex = payload.indexOf(searchKey); }
        if (keyIndex == -1) return key + " mevcut değil";
        int start = keyIndex + searchKey.length();
        int end   = payload.indexOf(",", start);
        if (end == -1) end = payload.indexOf("}", start);
        if (end == -1) return key + " mevcut değil";
        return payload.substring(start, end).trim()
                      .replace("\"", "").replace("\\n", "\n");
    }

    /**
     * Extracts the first complete JSON object {...} from a string.
     * Handles cases where the model emits preamble text before the JSON.
     */
    private String extractJsonObject(String response) {
        if (response == null) return "{}";
        int start = response.indexOf('{');
        int end   = response.lastIndexOf('}');
        if (start != -1 && end != -1 && end > start) {
            return response.substring(start, end + 1);
        }
        return response;
    }

    /**
     * Replaces English zodiac sign names and astrological aspect terms with their Turkish equivalents.
     * Applied to all AI responses to catch cases where the model slips into English.
     */
    private String replaceTurkishTerms(String response) {
        if (response == null) return "";
        return response
                // Zodiac signs
                .replace("Aries",       "Koç")
                .replace("Taurus",      "Boğa")
                .replace("Gemini",      "İkizler")
                .replace("Cancer",      "Yengeç")
                .replace("Leo",         "Aslan")
                .replace("Virgo",       "Başak")
                .replace("Libra",       "Terazi")
                .replace("Scorpio",     "Akrep")
                .replace("Sagittarius", "Yay")
                .replace("Capricorn",   "Oğlak")
                .replace("Aquarius",    "Kova")
                .replace("Pisces",      "Balık")
                // Planets (English → Turkish)
                .replace("Mercury",     "Merkür")
                .replace("Venus",       "Venüs")
                .replace("Mars",        "Mars")
                .replace("Jupiter",     "Jüpiter")
                .replace("Saturn",      "Satürn")
                .replace("Uranus",      "Uranüs")
                .replace("Neptune",     "Neptün")
                .replace("Pluto",       "Plüton")
                // Aspects
                .replace("Conjunction", "Kavuşum")
                .replace("Sextile",     "Altmışlık")
                .replace("Trine",       "Üçgen");
    }

    private String extractDreamContent(String payload) {
        if (payload == null || payload.isEmpty()) return "Rüya içeriği mevcut değil";
        if (payload.contains("dreamText")) {
            int start = payload.indexOf("dreamText") + 11;
            int end   = payload.indexOf("\"", start);
            if (end > start) return payload.substring(start, end).replace("\\n", "\n").replace("\\\"", "\"");
        }
        return payload;
    }
}
