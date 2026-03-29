package com.mysticai.orchestrator.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mysticai.common.event.AiAnalysisEvent;
import com.mysticai.orchestrator.dto.OracleInterpretationRequest;
import com.mysticai.orchestrator.prompt.MysticalPromptTemplates;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

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
            String locale = resolveLocaleForEvent(event);
            boolean hasLocale = locale != null && !locale.isBlank();
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

            if (event.analysisType() == AiAnalysisEvent.AnalysisType.NATAL_CHART) {
                response = normalizeNatalChartJson(response, event.payload(), locale);
            }
            if (event.analysisType() == AiAnalysisEvent.AnalysisType.RELATIONSHIP_ANALYSIS) {
                response = normalizeRelationshipAnalysisJson(response, event.payload());
            }

            // Only normalize zodiac/planet names to Turkish when locale is Turkish.
            // For English responses, keep the original English terms.
            if (!hasLocale || locale.toLowerCase().startsWith("tr")) {
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
            case NATAL_CHART, DREAM_SYNTHESIS, WEEKLY_SWOT, RELATIONSHIP_ANALYSIS -> true;
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

    /**
     * Fuses multiple upstream horoscope sources into a premium editorial text.
     * Complex: needs best model for quality editorial output.
     * Expects JSON body with systemPrompt and userPrompt fields.
     */
    public String fuseHoroscope(String systemPrompt, String userPrompt) {
        String combined = systemPrompt + "\n\n" + userPrompt;
        logger.info("Fusing horoscope, prompt length: {}", combined.length());
        try {
            String response = callAiModel(combined, true).trim();
            // Extract JSON object
            int start = response.indexOf('{');
            int end = response.lastIndexOf('}');
            if (start != -1 && end != -1) return response.substring(start, end + 1);
            return response;
        } catch (Exception e) {
            logger.error("Horoscope fusion failed: {}", e.getMessage());
            throw new RuntimeException("Horoscope fusion AI failed: " + e.getMessage(), e);
        }
    }

    /**
     * Runs a plain-text prompt through the simple fallback chain.
     * Used for lightweight tasks such as translation where premium fusion quality is unnecessary.
     */
    public String generateSimpleText(String systemPrompt, String userPrompt) {
        String combined = systemPrompt + "\n\n" + userPrompt;
        logger.info("Generating simple text, prompt length: {}", combined.length());
        try {
            return callAiModel(combined, false).trim();
        } catch (Exception e) {
            logger.error("Simple text generation failed: {}", e.getMessage());
            throw new RuntimeException("Simple AI generation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Produces an editorial Turkish localization for horoscope general text.
     * Uses the complex chain for higher writing quality and consistency.
     */
    public String generateEditorialHoroscopeTranslation(String sourceText, String sign, String period, String locale) {
        long startedAtNanos = System.nanoTime();
        String mode = "editorial_tr";
        String chain = "complex";
        String fallbackReason = "none";
        boolean success = false;

        try {
            if (!nonBlank(sourceText)) {
                fallbackReason = "empty_source";
                throw new IllegalArgumentException("sourceText is required");
            }

            String resolvedLocale = nonBlank(locale) ? locale.trim().toLowerCase(Locale.ROOT) : "tr";
            if (!resolvedLocale.startsWith("tr")) {
                fallbackReason = "locale_not_tr";
                success = true;
                return sourceText.trim();
            }

            String prompt = buildEditorialTranslationPrompt(sourceText, sign, period);
            String rawResponse = callAiModel(prompt, true);
            String normalized = normalizeEditorialTranslation(rawResponse);
            if (!nonBlank(normalized)) {
                fallbackReason = "empty_model_output";
                throw new IllegalStateException("Editorial translation returned empty output");
            }

            success = true;
            return normalized;
        } catch (Exception e) {
            if ("none".equals(fallbackReason)) {
                fallbackReason = "model_error";
            }
            logger.error("Editorial horoscope translation failed mode={} chain={} fallback_reason={} latency_ms={}",
                    mode, chain, fallbackReason, elapsedMs(startedAtNanos), e);
            throw new RuntimeException("Editorial horoscope translation failed: " + e.getMessage(), e);
        } finally {
            logger.info("Editorial horoscope translation completed mode={} chain={} fallback_reason={} latency_ms={} success={}",
                    mode, chain, fallbackReason, elapsedMs(startedAtNanos), success);
        }
    }

    private String buildEditorialTranslationPrompt(String sourceText, String sign, String period) {
        String resolvedSign = nonBlank(sign) ? sign.trim() : "unknown";
        String resolvedPeriod = nonBlank(period) ? period.trim() : "daily";

        return """
                Sen kıdemli bir astroloji editörü ve Türkçe yerelleştirme uzmanısın.
                Sana verilen burç metnini (İngilizce, Türkçe veya karışık olabilir) güçlü ve doğal Türkçe'ye editoryal kaliteyle uyarlayacaksın.

                ZORUNLU KURALLAR:
                - Anlamı koru; birebir kelime çevirisi yapmak zorunda değilsin.
                - Kaynakta olmayan yeni iddia, tarih, olay veya teknik astroloji detayı ekleme.
                - Ton uzman, sıcak, dengeli ve psikoloji-first olsun.
                - Deterministik kader dili kullanma; "olabilir", "destekleyebilir", "işaret edebilir" gibi olasılık dili kullan.
                - Burç ve astroloji terimlerini Türkçe ve tutarlı kullan.
                - Karma dil, bozuk çeviri ve yabancı kelime kalıntılarını temizle (örn: Luna, Kheiron, unique gibi ifadeleri doğal Türkçe karşılıklarıyla düzelt).
                - "Libra'lı", "Akrep Ayı", "Moon square Uranus" gibi melez/ham ifadeleri doğal Türkçe astroloji diline çevir.
                - Çıktı tek paragraf düz metin olsun. Başlık, liste, emoji, markdown, kod bloğu veya açıklama notu ekleme.
                - Sadece nihai Türkçe metni döndür.

                Bağlam:
                - Burç: %s
                - Periyot: %s

                Kaynak metin:
                %s
                """.formatted(resolvedSign, resolvedPeriod, sourceText);
    }

    private String normalizeEditorialTranslation(String rawResponse) {
        String normalized = normalizeParagraph(stripMarkdown(rawResponse), "");
        normalized = normalized.replaceAll("(?iu)^(çeviri|translation)\\s*[:\\-]\\s*", "");
        if ((normalized.startsWith("\"") && normalized.endsWith("\""))
                || (normalized.startsWith("'") && normalized.endsWith("'"))) {
            normalized = normalized.substring(1, normalized.length() - 1).trim();
        }
        return normalized;
    }

    private long elapsedMs(long startedAtNanos) {
        return (System.nanoTime() - startedAtNanos) / 1_000_000;
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
                    extractFromPayload(event.payload(), "allAspectsText"),
                    extractFromPayload(event.payload(), "userGender"),
                    extractFromPayload(event.payload(), "partnerGender"),
                    extractFromPayload(event.payload(), "baseHarmonyScore"));
        }
        return switch (event.sourceService()) {
            case DREAM     -> promptTemplates.getDreamInterpretationPrompt(
                                      extractDreamContent(event.payload()));
            case ASTROLOGY -> promptTemplates.getAstrologyInterpretationPrompt(event.payload());
            default        -> promptTemplates.getGenericInterpretationPrompt(event);
        };
    }

    private String resolveLocaleForEvent(AiAnalysisEvent event) {
        if (event.analysisType() == AiAnalysisEvent.AnalysisType.RELATIONSHIP_ANALYSIS) {
            return "tr";
        }
        String locale = extractFromPayload(event.payload(), "locale");
        if ("locale mevcut değil".equals(locale)) return null;
        return locale;
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

    private String normalizeRelationshipAnalysisJson(String response, String payload) {
        String userName = sanitizePartyName(extractFromPayload(payload, "userName"), "Kişi A");
        String partnerName = sanitizePartyName(extractFromPayload(payload, "partnerName"), "Kişi B");
        String relationshipType = extractFromPayload(payload, "relationshipType");
        int baseScore = parseScore(extractFromPayload(payload, "baseHarmonyScore"), 50);

        try {
            JsonNode parsed = objectMapper.readTree(response);
            if (parsed == null || !parsed.isObject()) {
                return buildFallbackRelationshipJson(userName, partnerName, relationshipType, baseScore);
            }

            ObjectNode root = (ObjectNode) parsed;
            ObjectNode out = objectMapper.createObjectNode();

            int aiScore = parseScore(text(root, "harmonyScore"), baseScore);
            int harmonyScore = constrainToReference(aiScore, baseScore, 8);
            out.put("harmonyScore", harmonyScore);

            String insightFallback = buildRelationshipInsightFallback(userName, partnerName, relationshipType, harmonyScore);
            out.put("harmonyInsight", ensureTurkishNarrative(text(root, "harmonyInsight"), insightFallback));

            List<String> strengthFallbacks = List.of(
                    userName + " ile " + partnerName + " arasında destekleyici alanlarda doğal bir tamamlayıcılık oluşabilir.",
                    "İletişimde kısa ve net cümleler kullanıldığında yanlış anlaşılma riski belirgin biçimde azalır.",
                    "Ortak hedefi küçük adımlara bölmek, bağın güven ve istikrar hissini güçlendirebilir."
            );
            out.set("strengths", normalizeRelationshipArray(root.path("strengths"), 3, strengthFallbacks));

            List<String> challengeFallbacks = List.of(
                    "Duygusal tempo farkı zaman zaman gerilim yaratabilir; konuşma için uygun anı birlikte seçmek faydalı olur.",
                    "Karar ritmi farklıysa biri hızlanırken diğeri geri çekilebilir; ortak karar öncesi kısa duraklama iyi gelir."
            );
            out.set("challenges", normalizeRelationshipArray(root.path("challenges"), 2, challengeFallbacks));

            String keyWarningFallback = "En kritik risk, hızla hüküm verip niyeti konuşmadan varsayım üretmek olabilir.";
            out.put("keyWarning", ensureTurkishNarrative(text(root, "keyWarning"), keyWarningFallback));

            String adviceFallback = buildRelationshipAdviceFallback(userName, partnerName, relationshipType);
            out.put("cosmicAdvice", ensureTurkishNarrative(text(root, "cosmicAdvice"), adviceFallback));

            return objectMapper.writeValueAsString(out);
        } catch (Exception e) {
            logger.warn("Relationship JSON normalization failed, using Turkish fallback: {}", e.getMessage());
            return buildFallbackRelationshipJson(userName, partnerName, relationshipType, baseScore);
        }
    }

    private ArrayNode normalizeRelationshipArray(JsonNode source, int size, List<String> fallbacks) {
        ArrayNode out = objectMapper.createArrayNode();
        if (source != null && source.isArray()) {
            for (JsonNode item : source) {
                if (out.size() >= size) break;
                String raw = item == null ? "" : item.asText("");
                String fallback = fallbackForIndex(fallbacks, out.size(), "Bu başlıkta denge için küçük ve tutarlı adımlar etkili olur.");
                String normalized = ensureTurkishNarrative(raw, fallback);
                if (nonBlank(normalized)) {
                    out.add(normalized);
                }
            }
        }
        while (out.size() < size) {
            out.add(fallbackForIndex(fallbacks, out.size(), "Bu başlıkta denge için küçük ve tutarlı adımlar etkili olur."));
        }
        return out;
    }

    private String fallbackForIndex(List<String> values, int index, String defaultValue) {
        if (values == null || index < 0 || index >= values.size()) return defaultValue;
        String value = values.get(index);
        return nonBlank(value) ? value : defaultValue;
    }

    private int parseScore(String raw, int fallback) {
        if (!nonBlank(raw)) return Math.max(0, Math.min(100, fallback));
        try {
            int parsed = (int) Math.round(Double.parseDouble(raw.replace(",", ".").trim()));
            return Math.max(0, Math.min(100, parsed));
        } catch (Exception ignored) {
            return Math.max(0, Math.min(100, fallback));
        }
    }

    private int constrainToReference(int score, int reference, int maxDelta) {
        int base = Math.max(0, Math.min(100, reference));
        int delta = Math.max(0, maxDelta);
        int min = Math.max(0, base - delta);
        int max = Math.min(100, base + delta);
        return Math.max(min, Math.min(max, score));
    }

    private String sanitizePartyName(String raw, String fallback) {
        String value = nonBlank(raw) ? raw : fallback;
        if (value == null) return fallback;
        String cleaned = value.trim().replaceAll("\\s{2,}", " ");
        if (cleaned.isBlank() || cleaned.endsWith("mevcut değil")) {
            return fallback;
        }
        return truncate(cleaned, 40);
    }

    private String relationTypeLabelTr(String relationshipType) {
        if (!nonBlank(relationshipType)) return "ilişki";
        return switch (relationshipType.toUpperCase(Locale.ROOT)) {
            case "LOVE" -> "aşk";
            case "BUSINESS" -> "iş ortaklığı";
            case "FRIENDSHIP" -> "arkadaşlık";
            case "FAMILY" -> "aile bağı";
            case "RIVAL" -> "rekabet";
            default -> "ilişki";
        };
    }

    private String buildRelationshipInsightFallback(String userName, String partnerName, String relationshipType, int score) {
        String level = score >= 80 ? "yüksek" : score >= 60 ? "orta-yüksek" : score >= 40 ? "dalgalı" : "zorlayıcı";
        String relation = relationTypeLabelTr(relationshipType);
        return "%s ve %s arasında %s odağında %d puanlık, %s bir uyum görünüyor.\n\n"
                .formatted(userName, partnerName, relation, score, level)
                + "Destekleyici alanlarda akış doğal olabilir; zorlayıcı alanlarda iletişim temposunu birlikte ayarlamak önemli.\n\n"
                + "Küçük ama düzenli ortak adımlar, bu eşleşmenin güçlü taraflarını daha görünür hale getirebilir.";
    }

    private String buildRelationshipAdviceFallback(String userName, String partnerName, String relationshipType) {
        String relation = relationTypeLabelTr(relationshipType);
        return "%s ve %s için en etkili yaklaşım, %s dinamiğinde beklentiyi baştan netleştirmek olur. "
                .formatted(userName, partnerName, relation)
                + "Haftada bir kısa check-in yapıp duyguyu ve ihtiyacı ayrı ayrı konuşun. "
                + "Gerilim yükseldiğinde önce tempo düşürüp sonra tek bir konuya odaklanın. "
                + "Bu ritim, güven ve yakınlık hissini daha sürdürülebilir hale getirebilir.";
    }

    private String buildFallbackRelationshipJson(String userName, String partnerName, String relationshipType, int baseScore) {
        try {
            ObjectNode out = objectMapper.createObjectNode();
            out.put("harmonyScore", Math.max(0, Math.min(100, baseScore)));
            out.put("harmonyInsight", buildRelationshipInsightFallback(userName, partnerName, relationshipType, baseScore));
            out.set("strengths", normalizeRelationshipArray(objectMapper.createArrayNode(), 3, List.of(
                    userName + " ve " + partnerName + " destekleyici başlıklarda birbirini tamamlayabilir.",
                    "Kısa ve net iletişim kalıbı, yanlış anlaşılma riskini azaltır.",
                    "Ortak hedeflerin küçük adımlara bölünmesi ilişki ritmini güçlendirebilir."
            )));
            out.set("challenges", normalizeRelationshipArray(objectMapper.createArrayNode(), 2, List.of(
                    "Duygusal tempo farkı gündelik iletişimde problem yaratabilir.",
                    "Kararsızlık kalınırsa problemler  yaşanabilir."
            )));
            out.put("keyWarning", "Varsayım üzerinden konuşmak yerine niyeti netleştirmeden karar vermemek kritik olur.");
            out.put("cosmicAdvice", buildRelationshipAdviceFallback(userName, partnerName, relationshipType));
            return objectMapper.writeValueAsString(out);
        } catch (Exception e) {
            return "{\"harmonyScore\":50,\"harmonyInsight\":\"Uyum analizi Türkçe güvenli biçimde yeniden oluşturuldu.\",\"strengths\":[\"Açık iletişim dengeyi güçlendirebilir.\",\"Ortak ritim güveni artırabilir.\",\"Küçük adımlar sürdürülebilir ilerleme sağlar.\"],\"challenges\":[\"Tempo farkı gerilim yaratabilir.\",\"Karar tarzı farkı yanlış anlaşılma üretebilir.\"],\"keyWarning\":\"Varsayım yerine doğrulama yapmadan hüküm verme.\",\"cosmicAdvice\":\"Önce duyguyu, sonra çözümü konuşun.\"}";
        }
    }

    private String ensureTurkishNarrative(String raw, String fallback) {
        String normalized = normalizeParagraph(replaceCommonEnglishRelationshipTerms(raw), fallback);
        if (!nonBlank(normalized)) {
            return fallback;
        }
        return looksEnglishDominant(normalized)
                ? normalizeParagraph(fallback, fallback)
                : normalized;
    }

    private String replaceCommonEnglishRelationshipTerms(String text) {
        if (text == null) return "";
        return text
                .replace("relationship", "ilişki")
                .replace("Relationship", "İlişki")
                .replace("compatibility", "uyum")
                .replace("Compatibility", "Uyum")
                .replace("communication", "iletişim")
                .replace("Communication", "İletişim")
                .replace("trust", "güven")
                .replace("Trust", "Güven")
                .replace("passion", "tutku")
                .replace("Passion", "Tutku")
                .replace("challenge", "zorlayıcı alan")
                .replace("Challenge", "Zorlayıcı Alan")
                .replace("growth", "gelişim")
                .replace("Growth", "Gelişim")
                .replace("advice", "öneri")
                .replace("Advice", "Öneri")
                .replace("warning", "uyarı")
                .replace("Warning", "Uyarı")
                .replace("support", "destek")
                .replace("Support", "Destek")
                .replace("balance", "denge")
                .replace("Balance", "Denge")
                .replace("trigger", "tetikleyici")
                .replace("Trigger", "Tetikleyici")
                .replace("pattern", "döngü")
                .replace("Pattern", "Döngü");
    }

    private boolean looksEnglishDominant(String text) {
        if (!nonBlank(text)) return true;
        String lower = text.toLowerCase(Locale.ROOT);
        int englishHits = 0;
        String[] markers = {
                " the ", " and ", " with ", " this ", " that ", " your ", " you ",
                " between ", " can ", " should ", " might ", " strong ", "weak ",
                " if ", " then ", " however ", " because ", " while "
        };
        String padded = " " + lower + " ";
        for (String marker : markers) {
            if (padded.contains(marker)) englishHits++;
        }
        boolean hasTurkishChars = lower.matches(".*[çğıöşü].*");
        return englishHits >= 3 && !hasTurkishChars;
    }

    /**
     * Backend-side validator/normalizer for the structured natal JSON schema.
     * Ensures the mobile app receives a stable shape even if the model returns
     * partial, malformed, or legacy-like data.
     */
    private String normalizeNatalChartJson(String response, String payload, String locale) {
        String resolvedLocale = isEnglishLocale(locale) ? "en" : "tr";
        try {
            JsonNode parsed = tryParseNatalJsonObject(response);
            if (parsed == null || !parsed.isObject()) {
                if (looksLikeNatalPayloadDump(response)) {
                    throw new IllegalStateException("Natal AI output looks like a raw payload dump");
                }
                logger.warn("Natal JSON normalization: response is not an object, building deterministic fallback");
                return buildFallbackNatalJson(response, payload, resolvedLocale);
            }

            if (looksLikeNatalPayloadDump(parsed.toString())) {
                throw new IllegalStateException("Natal AI output looks like a raw payload dump");
            }

            ObjectNode root = (ObjectNode) parsed;
            ObjectNode out = objectMapper.createObjectNode();
            out.put("version", "natal_v2");
            out.put("tone", nonBlank(text(root, "tone")) ? text(root, "tone") : "scientific_warm");
            out.put("opening", normalizeNatalParagraph(text(root, "opening"),
                    isEnglishLocale(resolvedLocale)
                            ? "This interpretation highlights both your strengths and your growth edges so the chart can be used as a practical map."
                            : "Haritanın ana temasını okurken güçlü tarafların ve gelişim alanların birlikte görünür. Bu yorum, potansiyellerini daha net fark etmen için yapılandırıldı.",
                    resolvedLocale));
            out.put("coreSummary", normalizeNatalParagraph(text(root, "coreSummary"),
                    isEnglishLocale(resolvedLocale)
                            ? "Your chart blends emotional instinct, long-range strategy, and a visible way of moving through life."
                            : "Büyük üçlü ve ana açılar bir araya geldiğinde karakterinde hem sezgisel hem stratejik çalışan bir denge dikkat çeker.",
                    resolvedLocale));

            ArrayNode sections = normalizeNatalSections(root.path("sections"), resolvedLocale);
            if (sections.isEmpty()) {
                sections.add(createFallbackSection(resolvedLocale));
            }
            out.set("sections", sections);

            ArrayNode planetHighlights = normalizeNatalPlanetHighlights(root.path("planetHighlights"), resolvedLocale);
            out.set("planetHighlights", planetHighlights);

            out.put("closing", normalizeNatalParagraph(text(root, "closing"),
                    isEnglishLocale(resolvedLocale)
                            ? "This chart is not a fixed fate statement. It becomes more useful as you turn awareness into consistent choices."
                            : "Bu harita bir kader hükmü değil, farkındalık haritasıdır. Güçlü taraflarını bilinçli kullandıkça zorlayıcı temaları da daha yaratıcı yönetebilirsin.",
                    resolvedLocale));

            if (!isUsableNatalOutput(out, resolvedLocale)) {
                logger.warn("Natal JSON normalization produced unusable {} output, switching to deterministic fallback", resolvedLocale);
                return buildFallbackNatalJson(response, payload, resolvedLocale);
            }

            return objectMapper.writeValueAsString(out);
        } catch (Exception e) {
            logger.warn("Natal JSON normalization failed, returning fallback envelope: {}", e.getMessage());
            return buildFallbackNatalJson(response, payload, resolvedLocale);
        }
    }

    private boolean looksLikeNatalPayloadDump(String text) {
        if (!nonBlank(text)) {
            return false;
        }
        String lower = text.toLowerCase(Locale.ROOT);
        int hits = 0;
        if (lower.contains("\"chartid\"") || lower.contains("chartid.")) hits++;
        if (lower.contains("\"sunsign\"") || lower.contains("sunsign.")) hits++;
        if (lower.contains("\"moonsign\"") || lower.contains("moonsign.")) hits++;
        if (lower.contains("\"risingsign\"") || lower.contains("risingsign.")) hits++;
        if (lower.contains("absolutelongitude")) hits++;
        if (lower.contains("planets. planet.")) hits++;
        if (lower.contains("retrograde. false. house.")) hits++;
        return hits >= 2;
    }

    private String buildFallbackNatalJson(String rawResponse, String payload, String locale) {
        String deterministic = buildDeterministicNatalJson(payload, locale);
        if (nonBlank(deterministic)) {
            return deterministic;
        }

        try {
            String recoveredNarrative = recoverNarrativeFromRawResponse(rawResponse);
            List<String> recoveredParagraphs = splitNarrativeParagraphs(recoveredNarrative);

            ObjectNode out = objectMapper.createObjectNode();
            out.put("version", "natal_v2");
            out.put("tone", "scientific_warm");
            out.put("opening", normalizeNatalParagraph(
                    recoveredParagraphs.size() > 0 ? recoveredParagraphs.get(0) : "",
                    isEnglishLocale(locale)
                            ? "The AI response could not be used directly, so the chart is being shown through a stable interpretation format."
                            : "Harita yorumunda beklenmeyen bir format geldiği için içerik sade bir akışla gösteriliyor.",
                    locale));
            out.put("coreSummary", normalizeNatalParagraph(
                    recoveredParagraphs.size() > 1 ? recoveredParagraphs.get(1) : "",
                    isEnglishLocale(locale)
                            ? "A stable chart reading was generated so the interpretation can stay available while the richer AI version improves."
                            : "Temel yorum korunarak başlıklara ayrıştırıldı; detaylar yeniden üretimde daha zenginleşir.",
                    locale));

            ArrayNode sections = objectMapper.createArrayNode();
            List<String> sectionSource = recoveredParagraphs.size() > 2
                    ? recoveredParagraphs.subList(2, recoveredParagraphs.size())
                    : recoveredParagraphs;
            int sectionIndex = 0;
            for (String paragraph : sectionSource) {
                if (sectionIndex >= 4) break;
                String cleaned = normalizeNatalParagraph(paragraph, "", locale);
                if (!nonBlank(cleaned) || cleaned.length() < 24) continue;
                sections.add(buildRecoveredSection(sectionIndex, cleaned, locale));
                sectionIndex += 1;
            }
            if (sections.isEmpty()) {
                sections.add(createFallbackSection(locale));
            }
            out.set("sections", sections);

            out.set("planetHighlights", objectMapper.createArrayNode());
            String closingFallback = isEnglishLocale(locale)
                    ? "A stable fallback interpretation is being shown for now. Richer section cards can be regenerated later."
                    : "Yorum bu aşamada sadeleştirilmiş yapıda sunuldu. Yeniden denediğinde daha detaylı bölüm kartları üretilecektir.";
            String closing = recoveredParagraphs.size() > 2
                    ? recoveredParagraphs.get(recoveredParagraphs.size() - 1)
                    : closingFallback;
            out.put("closing", normalizeNatalParagraph(closing, closingFallback, locale));
            return objectMapper.writeValueAsString(out);
        } catch (Exception e) {
            return isEnglishLocale(locale)
                    ? "{\"version\":\"natal_v2\",\"tone\":\"scientific_warm\",\"opening\":\"Natal interpretation fallback could not be normalized.\",\"coreSummary\":\"The raw response could not be preserved.\",\"sections\":[],\"planetHighlights\":[],\"closing\":\"Please try again.\"}"
                    : "{\"version\":\"natal_v2\",\"tone\":\"scientific_warm\",\"opening\":\"Yorum normalizasyonu başarısız oldu.\",\"coreSummary\":\"Ham çıktı korunamadı.\",\"sections\":[],\"planetHighlights\":[],\"closing\":\"Lütfen tekrar deneyin.\"}";
        }
    }

    private JsonNode tryParseNatalJsonObject(String response) {
        for (String candidate : buildNatalJsonParseCandidates(response)) {
            try {
                JsonNode parsed = objectMapper.readTree(candidate);
                if (parsed != null && parsed.isObject()) {
                    return parsed;
                }
                if (parsed != null && parsed.isTextual()) {
                    String innerText = extractJsonObject(stripMarkdown(parsed.asText("")));
                    if (!nonBlank(innerText)) continue;
                    try {
                        JsonNode innerParsed = objectMapper.readTree(innerText);
                        if (innerParsed != null && innerParsed.isObject()) {
                            return innerParsed;
                        }
                    } catch (Exception ignored) {
                        // Continue with the next candidate.
                    }
                }
            } catch (Exception ignored) {
                // Continue with the next candidate.
            }
        }
        return null;
    }

    private List<String> buildNatalJsonParseCandidates(String response) {
        List<String> candidates = new ArrayList<>();
        String raw = response == null ? "" : response.trim();
        String markdownStripped = stripMarkdown(raw);
        String extracted = extractJsonObject(markdownStripped);
        String normalized = normalizeLooseJson(extracted);
        String unwrappedStringified = unwrapStringifiedJsonCandidate(markdownStripped);

        addParseCandidate(candidates, raw);
        addParseCandidate(candidates, markdownStripped);
        addParseCandidate(candidates, extracted);
        addParseCandidate(candidates, normalized);
        addParseCandidate(candidates, extractJsonObject(normalized));

        if (nonBlank(unwrappedStringified)) {
            String normalizedInner = normalizeLooseJson(unwrappedStringified);
            addParseCandidate(candidates, unwrappedStringified);
            addParseCandidate(candidates, extractJsonObject(unwrappedStringified));
            addParseCandidate(candidates, normalizedInner);
            addParseCandidate(candidates, extractJsonObject(normalizedInner));
        }

        return candidates;
    }

    private void addParseCandidate(List<String> target, String candidate) {
        if (!nonBlank(candidate)) return;
        String trimmed = candidate.trim();
        if (trimmed.isEmpty() || target.contains(trimmed)) return;
        target.add(trimmed);
    }

    private String normalizeLooseJson(String input) {
        if (!nonBlank(input)) return "";
        return input
                .replace('“', '"')
                .replace('”', '"')
                .replace('‘', '\'')
                .replace('’', '\'')
                .replaceAll(",\\s*([}\\]])", "$1")
                .replaceAll("([{,]\\s*)([A-Za-z_][A-Za-z0-9_-]*)(\\s*:)", "$1\"$2\"$3")
                .replaceAll("([{,]\\s*)'([^']+)'(\\s*:)", "$1\"$2\"$3")
                .replaceAll(":\\s*'([^'\\\\]*(?:\\\\.[^'\\\\]*)*)'(\\s*[,}\\]])", ": \"$1\"$2");
    }

    private String unwrapStringifiedJsonCandidate(String input) {
        if (!nonBlank(input)) return "";
        String trimmed = input.trim();
        if (!(trimmed.startsWith("\"") && trimmed.endsWith("\""))) return "";
        try {
            JsonNode parsed = objectMapper.readTree(trimmed);
            if (parsed != null && parsed.isTextual()) {
                return parsed.asText("").trim();
            }
        } catch (Exception ignored) {
            // Not a JSON string; ignore.
        }
        return "";
    }

    private String recoverNarrativeFromRawResponse(String rawResponse) {
        if (!nonBlank(rawResponse)) return "";

        List<String> fragments = new ArrayList<>();
        for (String candidate : buildNatalJsonParseCandidates(rawResponse)) {
            try {
                JsonNode parsed = objectMapper.readTree(candidate);
                collectNarrativeFragments(parsed, fragments, 0);
                if (!fragments.isEmpty()) break;
            } catch (Exception ignored) {
                // Keep trying candidates.
            }
        }

        if (!fragments.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < fragments.size() && i < 8; i++) {
                if (sb.length() > 0) sb.append("\n\n");
                sb.append(fragments.get(i));
            }
            return sb.toString();
        }

        String plain = normalizeParagraph(stripMarkdown(rawResponse), "");
        if (plain.contains("{") && plain.contains("}")) {
            plain = plain
                    .replaceAll("[\\{\\}\\[\\]\"]", " ")
                    .replaceAll("[,:;]+", ". ")
                    .replaceAll("\\s{2,}", " ")
                    .trim();
        }
        return plain;
    }

    private void collectNarrativeFragments(JsonNode node, List<String> out, int depth) {
        if (node == null || node.isNull() || depth > 5 || out.size() >= 12) return;

        if (node.isTextual()) {
            String text = normalizeParagraph(node.asText(""), "");
            if (text.length() < 18 || looksTechnicalRecoveryLine(text)) return;
            addDistinctFragment(out, truncate(text, 420), 12);
            return;
        }

        if (node.isArray()) {
            for (JsonNode child : node) {
                collectNarrativeFragments(child, out, depth + 1);
                if (out.size() >= 12) break;
            }
            return;
        }

        if (node.isObject()) {
            node.fields().forEachRemaining(entry -> collectNarrativeFragments(entry.getValue(), out, depth + 1));
        }
    }

    private void addDistinctFragment(List<String> target, String candidate, int maxSize) {
        if (!nonBlank(candidate) || target.size() >= maxSize) return;
        for (String existing : target) {
            if (existing.equalsIgnoreCase(candidate)) return;
        }
        target.add(candidate);
    }

    private boolean looksTechnicalRecoveryLine(String text) {
        if (!nonBlank(text)) return false;
        String lower = text.toLowerCase(Locale.ROOT);
        return lower.contains("json şemasına")
                || lower.contains("normalize edilmiş")
                || lower.contains("teknik olarak düzeltildi")
                || lower.contains("yorum dönüştürme notu")
                || lower.contains("ham içerik özeti")
                || lower.contains("normalizasyon");
    }

    private List<String> splitNarrativeParagraphs(String narrative) {
        List<String> out = new ArrayList<>();
        if (!nonBlank(narrative)) return out;

        String normalized = narrative
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
        if (normalized.isEmpty()) return out;

        String[] blocks = normalized.split("\\n{2,}");
        for (String block : blocks) {
            String cleaned = normalizeParagraph(block, "");
            if (!nonBlank(cleaned) || cleaned.length() < 20) continue;
            addDistinctFragment(out, cleaned, 8);
        }

        if (!out.isEmpty()) return out;

        String[] sentences = normalized.split("(?<=[.!?])\\s+");
        StringBuilder current = new StringBuilder();
        for (String sentence : sentences) {
            String part = normalizeParagraph(sentence, "");
            if (!nonBlank(part)) continue;

            if (current.length() == 0) {
                current.append(part);
                continue;
            }

            if (current.length() + 1 + part.length() > 280) {
                addDistinctFragment(out, current.toString(), 8);
                current.setLength(0);
                current.append(part);
            } else {
                current.append(' ').append(part);
            }
        }
        if (current.length() > 0) {
            addDistinctFragment(out, current.toString(), 8);
        }

        return out;
    }

    private ObjectNode buildRecoveredSection(int index, String paragraph, String locale) {
        ObjectNode section = objectMapper.createObjectNode();
        section.put("id", "recovered_section_" + (index + 1));
        section.put("title", defaultRecoveredSectionTitle(index, locale));
        section.put("body", truncate(paragraph, 420));
        section.put("dailyLifeExample", defaultRecoveredDailyExample(index, locale));
        ArrayNode bullets = objectMapper.createArrayNode();
        bullets.add(bullet(
                isEnglishLocale(locale) ? "Key Point" : "Öne Çıkan Nokta",
                truncate(paragraph, 180),
                locale
        ));
        section.set("bulletPoints", bullets);
        return section;
    }

    private String defaultRecoveredSectionTitle(int index, String locale) {
        if (isEnglishLocale(locale)) {
            return switch (index) {
                case 0 -> "Cosmic Main Theme";
                case 1 -> "Emotional and Mental Flow";
                case 2 -> "Relationships and Daily Life";
                default -> "Growth Focus";
            };
        }
        return switch (index) {
            case 0 -> "Kozmik Ana Tema";
            case 1 -> "Duygusal ve Zihinsel Akış";
            case 2 -> "İlişkiler ve Günlük Yaşam";
            default -> "Gelişim Odağı";
        };
    }

    private String defaultRecoveredDailyExample(int index, String locale) {
        if (isEnglishLocale(locale)) {
            return switch (index) {
                case 0 -> "You notice this theme most clearly when you pause before reacting and name what really matters.";
                case 1 -> "When emotion and communication move at the same pace, your choices feel calmer and clearer.";
                case 2 -> "Small but consistent actions in relationships make this pattern visible in everyday life.";
                default -> "This section helps you simplify priorities before choosing the next step.";
            };
        }
        return switch (index) {
            case 0 -> "Günlük akışta bu tema, karar verirken hangi iç sesin öne çıktığını fark etmeni sağlar.";
            case 1 -> "İletişim ve duygu arasında denge kurduğunda daha net ve sakin ilerlersin.";
            case 2 -> "İlişkilerde küçük ama tutarlı adımlar bu temayı somut biçimde güçlendirir.";
            default -> "Bu başlık, bir sonraki adımı belirlerken önceliklerini sadeleştirmen için yol gösterir.";
        };
    }

    private ArrayNode normalizeNatalSections(JsonNode sectionsNode, String locale) {
        ArrayNode out = objectMapper.createArrayNode();
        if (sectionsNode == null || !sectionsNode.isArray()) return out;

        int index = 0;
        for (JsonNode node : sectionsNode) {
            if (out.size() >= 9) break;
            if (node == null || !node.isObject()) continue;
            ObjectNode section = objectMapper.createObjectNode();

            String rawId = nonBlank(text(node, "id")) ? text(node, "id") : text(node, "title");
            String rawTitle = text(node, "title");
            String body = normalizeNatalParagraph(firstNonBlank(
                    text(node, "body"),
                    text(node, "text"),
                    text(node, "content"),
                    text(node, "description")), isEnglishLocale(locale) ? "A stable summary was generated for this part of the chart." : "Bu bölüm için yorum özeti hazırlanamadı.", locale);
            String daily = normalizeNatalParagraph(firstNonBlank(
                    text(node, "dailyLifeExample"),
                    text(node, "daily_life_example"),
                    text(node, "example")), isEnglishLocale(locale) ? "In daily life this theme can shape how you choose, react, and relate." : "Günlük hayatta bu tema kararlarını ve ilişkilerini küçük ama etkili biçimde yönlendirebilir.", locale);

            section.put("id", normalizeSnakeCase(rawId, "section_" + (index + 1)));
            section.put("title", normalizeNatalUiTitle(rawTitle, isEnglishLocale(locale) ? "Section " + (index + 1) : "Bölüm " + (index + 1), locale));
            section.put("body", body);
            section.put("dailyLifeExample", daily);
            section.set("bulletPoints", normalizeNatalBulletPoints(node.path("bulletPoints"), body, daily, locale));

            out.add(section);
            index += 1;
        }
        return out;
    }

    private ArrayNode normalizeNatalPlanetHighlights(JsonNode planetNode, String locale) {
        ArrayNode out = objectMapper.createArrayNode();
        if (planetNode == null || !planetNode.isArray()) return out;

        int count = 0;
        for (JsonNode node : planetNode) {
            if (count >= 12) break;
            if (node == null || !node.isObject()) continue;

            String rawPlanetId = firstNonBlank(text(node, "planetId"), text(node, "planet"), text(node, "id"));
            String planetId = normalizePlanetId(rawPlanetId);
            if (!nonBlank(planetId)) {
                continue;
            }

            String intro = normalizeNatalParagraph(text(node, "intro"),
                    isEnglishLocale(locale)
                            ? "This placement reveals one of the core energies running through your chart."
                            : "Bu yerleşim karakterinin önemli bir temasını görünür kılar.",
                    locale);
            String character = normalizeNatalParagraph(text(node, "character"),
                    isEnglishLocale(locale)
                            ? "The sign and house placement show how this planet tends to operate in your personality."
                            : "Burç ve ev yerleşimi bu gezegenin sende nasıl çalıştığını belirginleştirir.",
                    locale);
            String depth = normalizeNatalParagraph(text(node, "depth"),
                    isEnglishLocale(locale)
                            ? "This placement carries both a strength and a growth edge; stress reveals the lesson, awareness reveals the talent."
                            : "Bu konum hem yetenek hem gelişim alanı barındırır; gölge tarafı fark etmek potansiyeli açar.",
                    locale);
            String daily = normalizeNatalParagraph(firstNonBlank(text(node, "dailyLifeExample"), text(node, "daily_life_example")),
                    isEnglishLocale(locale)
                            ? "You notice this energy in daily choices, timing, and the way you handle pressure."
                            : "Günlük kararlarında bu enerjiyi bilinçli kullandığında daha dengeli sonuç alırsın.",
                    locale);

            ObjectNode outNode = objectMapper.createObjectNode();
            outNode.put("planetId", planetId);
            outNode.put("title", normalizeNatalUiTitle(text(node, "title"), defaultNatalPlanetTitle(planetId, locale), locale));
            outNode.put("intro", intro);
            outNode.put("character", character);
            outNode.put("depth", depth);
            outNode.put("dailyLifeExample", daily);
            outNode.set("analysisLines", normalizeNatalAnalysisLines(node.path("analysisLines"), character, intro, depth, daily, locale));
            out.add(outNode);
            count += 1;
        }
        return out;
    }

    private ArrayNode normalizeNatalBulletPoints(JsonNode bulletNode, String body, String daily, String locale) {
        ArrayNode out = objectMapper.createArrayNode();
        if (bulletNode != null && bulletNode.isArray()) {
            for (JsonNode bp : bulletNode) {
                if (out.size() >= 5) break;
                if (bp == null || bp.isNull()) continue;
                ObjectNode item = objectMapper.createObjectNode();
                if (bp.isTextual()) {
                    item.put("title", normalizeNatalUiTitle(
                            isEnglishLocale(locale) ? "Key Point" : "Ana Nokta",
                            isEnglishLocale(locale) ? "Key Point" : "Ana Nokta",
                            locale
                    ));
                    item.put("detail", truncate(normalizeNatalParagraph(bp.asText(), "", locale), 180));
                } else if (bp.isObject()) {
                    String title = normalizeNatalUiTitle(
                            firstNonBlank(text(bp, "title"), text(bp, "label"), text(bp, "name")),
                            isEnglishLocale(locale) ? "Key Point" : "Ana Nokta",
                            locale
                    );
                    String detail = truncate(normalizeNatalParagraph(firstNonBlank(text(bp, "detail"), text(bp, "text"), text(bp, "body")), "", locale), 200);
                    if (!nonBlank(detail)) continue;
                    item.put("title", title);
                    item.put("detail", detail);
                } else {
                    continue;
                }
                out.add(item);
            }
        }

        if (out.isEmpty()) {
            out.add(bullet(isEnglishLocale(locale) ? "Main Theme" : "Ana Tema", truncate(body, 180), locale));
            out.add(bullet(isEnglishLocale(locale) ? "Daily Reflection" : "Günlük Hayata Yansıması", truncate(daily, 180), locale));
        }
        return out;
    }

    private ArrayNode normalizeNatalAnalysisLines(JsonNode linesNode, String character, String intro, String depth, String daily, String locale) {
        ArrayNode out = objectMapper.createArrayNode();
        if (linesNode != null && linesNode.isArray()) {
            for (JsonNode line : linesNode) {
                if (out.size() >= 6) break;
                if (line == null || !line.isObject()) continue;
                String text = normalizeNatalParagraph(firstNonBlank(text(line, "text"), text(line, "detail"), text(line, "body")), "", locale);
                if (!nonBlank(text)) continue;
                ObjectNode item = objectMapper.createObjectNode();
                item.put("icon", normalizeLineIcon(text(line, "icon")));
                item.put("title", normalizeNatalUiTitle(text(line, "title"), isEnglishLocale(locale) ? "Analysis" : "Analiz", locale));
                item.put("text", truncate(text, 220));
                out.add(item);
            }
        }

        if (out.isEmpty()) {
            out.add(analysisLine("sparkles", isEnglishLocale(locale) ? "Character Analysis" : "Karakter Analizi", truncate(character, 220), locale));
            out.add(analysisLine("rocket", isEnglishLocale(locale) ? "How It Affects You" : "Seni Nasıl Etkiler?", truncate(firstNonBlank(intro, daily), 220), locale));
            out.add(analysisLine("warning", isEnglishLocale(locale) ? "Watch Out For" : "Dikkat Etmen Gerekenler", truncate(depth, 220), locale));
            out.add(analysisLine("star", isEnglishLocale(locale) ? "Key Strengths" : "Öne Çıkan Özellikler", truncate(daily, 220), locale));
        }

        return out;
    }

    private ObjectNode createFallbackSection(String locale) {
        ObjectNode section = objectMapper.createObjectNode();
        section.put("id", "core_portrait");
        if (isEnglishLocale(locale)) {
            section.put("title", "Cosmic Portrait Essence");
            section.put("body", "The main themes of the chart were reorganized into a stable reading structure so the interpretation stays available.");
            section.put("dailyLifeExample", "In daily life this helps you notice which inner drive is leading your choices before you react automatically.");
        } else {
            section.put("title", "Kozmik Portrenin Özü");
            section.put("body", "Haritanın ana temaları sade bir akışla toparlandı ve okunabilir bölüm yapısına yerleştirildi.");
            section.put("dailyLifeExample", "Günlük hayatta bu tema, kararlarını alırken hangi iç güdünün öne çıktığını daha iyi fark etmene yardım eder.");
        }
        ArrayNode bullets = objectMapper.createArrayNode();
        bullets.add(bullet(
                isEnglishLocale(locale) ? "Reading Flow" : "Yorum Akışı",
                isEnglishLocale(locale)
                        ? "The content was rebuilt into clearer titles and short explanations."
                        : "İçerik, başlık ve kısa açıklamalar halinde daha net okunacak biçime getirildi.",
                locale
        ));
        bullets.add(bullet(
                isEnglishLocale(locale) ? "Next Pass" : "Sonraki Üretim",
                isEnglishLocale(locale)
                        ? "A richer AI pass can still regenerate more detailed planet cards later."
                        : "Yeniden üretimde daha detaylı bölüm kartları ve gezegen satırları oluşacaktır.",
                locale
        ));
        section.set("bulletPoints", bullets);
        return section;
    }

    private ObjectNode bullet(String title, String detail, String locale) {
        ObjectNode n = objectMapper.createObjectNode();
        n.put("title", normalizeNatalUiTitle(title, isEnglishLocale(locale) ? "Key Point" : "Ana Nokta", locale));
        n.put("detail", normalizeNatalParagraph(detail, "", locale));
        return n;
    }

    private ObjectNode analysisLine(String icon, String title, String text, String locale) {
        ObjectNode n = objectMapper.createObjectNode();
        n.put("icon", normalizeLineIcon(icon));
        n.put("title", normalizeNatalUiTitle(title, isEnglishLocale(locale) ? "Analysis" : "Analiz", locale));
        n.put("text", normalizeNatalParagraph(text, "", locale));
        return n;
    }

    private String normalizeNatalUiTitle(String raw, String fallback, String locale) {
        String src = nonBlank(raw) ? raw : fallback;
        src = sanitizeNatalNarrative(src == null ? "" : src, locale);
        src = src.replaceAll("[\\{\\}\\[\\]\"]", " ")
                 .replace('_', ' ')
                 .replace('-', ' ')
                 .replaceAll("\\s+", " ")
                 .trim();
        if (src.isEmpty()) return fallback;
        if (src.equals(src.toUpperCase(Locale.ROOT))) {
            src = toTitleCase(src.toLowerCase(Locale.ROOT));
        }
        return truncate(src, 64);
    }

    private String normalizeNatalParagraph(String raw, String fallback, String locale) {
        String s = nonBlank(raw) ? raw : fallback;
        if (s == null) return "";
        s = sanitizeNatalNarrative(s, locale)
                .replaceAll("[\\r\\n\\t]+", " ")
                .replaceAll("\\s{2,}", " ")
                .trim();
        return s;
    }

    private String sanitizeNatalNarrative(String input, String locale) {
        if (!nonBlank(input)) return input == null ? "" : input;
        String normalized = input
                .replace('“', '"')
                .replace('”', '"')
                .replace('’', '\'')
                .replace('‘', '\'');
        if (isEnglishLocale(locale)) {
            return normalized
                    .replaceAll("\\s+,", ",")
                    .replaceAll("\\s+\\.", ".")
                    .replaceAll("\\s{2,}", " ")
                    .trim();
        }
        return sanitizeAiLanguageArtifacts(replaceTurkishTerms(normalized));
    }

    private String defaultNatalPlanetTitle(String planetId, String locale) {
        if (isEnglishLocale(locale)) {
            return switch (planetId) {
                case "sun" -> "Sun: core identity";
                case "moon" -> "Moon: emotional center";
                case "mercury" -> "Mercury: mind and expression";
                case "venus" -> "Venus: relationships and values";
                case "mars" -> "Mars: drive and momentum";
                case "jupiter" -> "Jupiter: growth and meaning";
                case "saturn" -> "Saturn: structure and responsibility";
                case "uranus" -> "Uranus: liberation and change";
                case "neptune" -> "Neptune: intuition and imagination";
                case "pluto" -> "Pluto: transformation and depth";
                case "chiron" -> "Chiron: healing and sensitivity";
                case "north_node" -> "North Node: growth direction";
                default -> "Planetary Placement";
            };
        }
        return switch (planetId) {
            case "sun" -> "Güneş: yaşam kıvılcımın";
            case "moon" -> "Ay: duygusal merkezin";
            case "mercury" -> "Merkür: zihin ve ifade biçimin";
            case "venus" -> "Venüs: ilişki ve zevk alanın";
            case "mars" -> "Mars: hareket ve mücadele enerjin";
            case "jupiter" -> "Jüpiter: büyüme ve anlam arayışın";
            case "saturn" -> "Satürn: yapı ve sorumluluk alanın";
            case "uranus" -> "Uranüs: özgürleşme dürtün";
            case "neptune" -> "Neptün: sezgi ve hayal gücün";
            case "pluto" -> "Plüton: dönüşüm gücün";
            case "chiron" -> "Kiron: şifa ve hassasiyet alanın";
            case "north_node" -> "Kuzey Düğümü: gelişim yönün";
            default -> "Gezegen Yerleşimi";
        };
    }

    private String normalizeUiTitle(String raw, String fallback) {
        String src = nonBlank(raw) ? raw : fallback;
        src = sanitizeAiLanguageArtifacts(replaceTurkishTerms(src == null ? "" : src));
        src = src.replaceAll("[\\{\\}\\[\\]\"]", " ")
                 .replace('_', ' ')
                 .replace('-', ' ')
                 .replaceAll("\\s+", " ")
                 .trim();
        if (src.isEmpty()) return fallback;
        if (src.equals(src.toUpperCase())) {
            src = toTitleCase(src.toLowerCase());
        }
        return truncate(src, 64);
    }

    private String normalizeLineIcon(String raw) {
        String icon = (raw == null ? "" : raw.trim().toLowerCase());
        return switch (icon) {
            case "sparkles", "sparkles-outline", "star", "star-outline", "rocket", "rocket-outline",
                 "warning", "warning-outline", "people", "people-outline" -> icon.replace("-outline", "");
            default -> "sparkles";
        };
    }

    private String normalizePlanetId(String raw) {
        if (!nonBlank(raw)) return "";
        String p = raw.trim().toLowerCase()
                .replace(" ", "_")
                .replace("-", "_")
                .replace("northnode", "north_node")
                .replace("north node", "north_node")
                .replace("southnode", "south_node");

        return switch (p) {
            case "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
                 "uranus", "neptune", "pluto", "chiron", "north_node" -> p;
            default -> normalizeSnakeCase(p, p);
        };
    }

    private String defaultPlanetTitle(String planetId) {
        return switch (planetId) {
            case "sun" -> "Güneş: yaşam kıvılcımın";
            case "moon" -> "Ay: duygusal merkezin";
            case "mercury" -> "Merkür: zihin ve ifade biçimin";
            case "venus" -> "Venüs: ilişki ve zevk alanın";
            case "mars" -> "Mars: hareket ve mücadele enerjin";
            case "jupiter" -> "Jüpiter: büyüme ve anlam arayışın";
            case "saturn" -> "Satürn: yapı ve sorumluluk alanın";
            case "uranus" -> "Uranüs: özgürleşme dürtün";
            case "neptune" -> "Neptün: sezgi ve hayal gücün";
            case "pluto" -> "Plüton: dönüşüm gücün";
            case "chiron" -> "Kiron: şifa ve hassasiyet alanın";
            case "north_node" -> "Kuzey Düğümü: gelişim yönün";
            default -> "Gezegen Yerleşimi";
        };
    }

    private String normalizeSnakeCase(String raw, String fallback) {
        if (!nonBlank(raw)) return fallback;
        String s = raw.trim().toLowerCase()
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .replaceAll("_+", "_");
        return s.isEmpty() ? fallback : truncate(s, 48);
    }

    private String normalizeParagraph(String raw, String fallback) {
        String s = nonBlank(raw) ? raw : fallback;
        if (s == null) return "";
        s = sanitizeAiLanguageArtifacts(replaceTurkishTerms(s))
             .replaceAll("[\\r\\n\\t]+", " ")
             .replaceAll("\\s{2,}", " ")
             .trim();
        return s;
    }

    /**
     * Cleans mixed-language artefacts occasionally produced by the LLM in Turkish natal interpretations.
     * Example failures observed in production-like outputs:
     *  - "Muaz'insometimes"  -> should become "Muaz'in bazen"
     *  - "worldsine"         -> malformed token inside Turkish sentence
     *  - "nguồnını"          -> Vietnamese fragment injected into Turkish suffix chain
     */
    private String sanitizeAiLanguageArtifacts(String input) {
        if (input == null || input.isBlank()) return input == null ? "" : input;

        String s = input;

        // Join-point fix: Turkish possessive suffix + English token glued together
        s = s.replaceAll(
                "(?iu)([\\p{L}ÇĞİÖŞÜçğıöşü]+['’](?:in|ın|un|ün|nin|nın|nun|nün))(?=(?:sometimes|often|rarely|usually|however|also|socially|emotionally|himself|herself|themselves)\\b)",
                "$1 "
        );

        // Known malformed tokens seen in AI outputs (frontend fallback also handles these for cached content)
        s = s.replaceAll("(?iu)\\bworldsine\\b", "dünyasına");
        s = s.replaceAll("(?iu)\\bngu[oồốổỗộơờớởỡợuưồn]*[^\\s,.!?;:]*ını\\b", "kaynağını");
        s = s.replaceAll("(?iu)\\bpoççğimiz\\b", "yaklaşımımızla");

        // Zodiac signs and astro terms that may survive in mixed-language output
        s = s.replaceAll("(?iu)\\baries\\b", "Koç");
        s = s.replaceAll("(?iu)\\btaurus\\b", "Boğa");
        s = s.replaceAll("(?iu)\\bgemini\\b", "İkizler");
        s = s.replaceAll("(?iu)\\bcancer\\b", "Yengeç");
        s = s.replaceAll("(?iu)\\bleo\\b", "Aslan");
        s = s.replaceAll("(?iu)\\bvirgo\\b", "Başak");
        s = s.replaceAll("(?iu)\\blibra\\b", "Terazi");
        s = s.replaceAll("(?iu)\\bscorpio\\b", "Akrep");
        s = s.replaceAll("(?iu)\\bsagittarius\\b", "Yay");
        s = s.replaceAll("(?iu)\\bcapricorn\\b", "Oğlak");
        s = s.replaceAll("(?iu)\\baquarius\\b", "Kova");
        s = s.replaceAll("(?iu)\\bpisces\\b", "Balık");
        s = s.replaceAll("(?iu)\\bconjunction\\b", "kavuşum");
        s = s.replaceAll("(?iu)\\bsextile\\b", "altmışlık");
        s = s.replaceAll("(?iu)\\bsquare\\b", "kare");
        s = s.replaceAll("(?iu)\\btrine\\b", "üçgen");
        s = s.replaceAll("(?iu)\\bopposition\\b", "karşıt");

        // Common English narrative remnants
        s = s.replaceAll("(?iu)\\bhimself\\b", "kendini");
        s = s.replaceAll("(?iu)\\bherself\\b", "kendini");
        s = s.replaceAll("(?iu)\\bthemselves\\b", "kendilerini");
        s = s.replaceAll("(?iu)\\bluna\\b", "Ay");
        s = s.replaceAll("(?iu)\\bkheiron\\b", "Kiron");
        s = s.replaceAll("(?iu)\\bchiron\\b", "Kiron");
        s = s.replaceAll("(?iu)\\bunique\\b", "özgün");
        s = s.replaceAll("(?iu)\\bsometimes\\b", "bazen");
        s = s.replaceAll("(?iu)\\boften\\b", "sık sık");
        s = s.replaceAll("(?iu)\\brarely\\b", "nadiren");
        s = s.replaceAll("(?iu)\\busually\\b", "genelde");
        s = s.replaceAll("(?iu)\\bhowever\\b", "ancak");
        s = s.replaceAll("(?iu)\\balso\\b", "ayrıca");
        s = s.replaceAll("(?iu)\\bsocially\\b", "sosyal olarak");
        s = s.replaceAll("(?iu)\\bemotionally\\b", "duygusal olarak");

        // Normalize mixed Turkish suffix artifacts produced by literal translations
        s = s.replaceAll("(?iu)\\b(koç|boğa|ikizler|yengeç|aslan|başak|terazi|akrep|yay|oğlak|kova|balık)['’]l[ıiuü]\\b", "$1 burcu");
        s = s.replaceAll("(?iu)\\b(koç|boğa|ikizler|yengeç|aslan|başak|terazi|akrep|yay|oğlak|kova|balık)\\s+ayı\\b", "$1 burcundaki Ay");
        s = s.replaceAll("(?iu)\\bsenin\\s+şakalara\\b", "şakalarına");
        s = s.replaceAll("(?iu)\\btuhaf\\b", "özgün");
        s = s.replaceAll("(?iu)\\bgarip\\b", "alışılmadık");
        s = s.replaceAll("(?iu)\\bözgün\\s+ve\\s+özgün\\b", "en özgün");

        // Clean punctuation artifacts after token repairs
        s = s.replaceAll("\\s+,", ",")
             .replaceAll("\\s+\\.", ".")
             .replaceAll("\\s{2,}", " ");

        return s.trim();
    }

    private boolean isEnglishLocale(String locale) {
        return nonBlank(locale) && locale.toLowerCase(Locale.ROOT).startsWith("en");
    }

    private boolean isUsableNatalOutput(ObjectNode root, String locale) {
        if (root == null) {
            return false;
        }

        if (root.path("sections").size() < 4 || root.path("planetHighlights").size() < 3) {
            return false;
        }

        String combined = collectNatalNarrative(root);
        String lower = combined.toLowerCase(Locale.ROOT);
        if (lower.contains("temel yorum korunarak başlıklara ayrıştırıldı")
                || lower.contains("yorum bu aşamada sadeleştirilmiş yapıda sunuldu")
                || lower.contains("yeniden üretimde daha zenginleşir")
                || lower.contains("chartid.")
                || lower.contains("absolutelongitude")) {
            return false;
        }

        String inferredLocale = inferNarrativeLocale(combined);
        return locale.equals(inferredLocale);
    }

    private String collectNatalNarrative(JsonNode node) {
        StringBuilder sb = new StringBuilder();
        appendNarrativeText(node, sb, 0);
        return sb.toString();
    }

    private void appendNarrativeText(JsonNode node, StringBuilder sb, int depth) {
        if (node == null || node.isNull() || depth > 6 || sb.length() > 8000) {
            return;
        }

        if (node.isTextual()) {
            String text = node.asText("");
            if (nonBlank(text)) {
                if (!sb.isEmpty()) sb.append(' ');
                sb.append(text);
            }
            return;
        }

        if (node.isArray()) {
            for (JsonNode child : node) {
                appendNarrativeText(child, sb, depth + 1);
            }
            return;
        }

        if (node.isObject()) {
            node.fields().forEachRemaining(entry -> appendNarrativeText(entry.getValue(), sb, depth + 1));
        }
    }

    private String inferNarrativeLocale(String text) {
        if (!nonBlank(text)) {
            return null;
        }
        String lower = text.toLowerCase(Locale.ROOT);
        boolean hasTurkish = containsTurkishSignals(lower);
        boolean hasEnglish = containsEnglishSignals(lower);
        if (hasEnglish && !hasTurkish) return "en";
        if (hasTurkish && !hasEnglish) return "tr";
        if (hasEnglish && hasTurkish) return "mixed";
        return null;
    }

    private boolean containsTurkishSignals(String lower) {
        return lower.matches(".*[çğıöşü].*")
                || lower.matches(".*\\b(ve|ile|icin|için|dogum|doğum|harita|haritan|yorum|yorumun|yukselen|yükselen|burc|burcu|gezegen|duygusal|ilişki|güven|içsel|karakter|gösterir|gösteriyor)\\b.*");
    }

    private boolean containsEnglishSignals(String lower) {
        return lower.matches(".*\\b(the|and|your|chart|sun|moon|rising|house|planet|relationship|career|daily|example|interpretation|strength|growth|identity|emotional)\\b.*");
    }

    private String buildDeterministicNatalJson(String payload, String locale) {
        try {
            NatalPayloadView natal = objectMapper.readValue(payload, NatalPayloadView.class);
            String resolvedLocale = isEnglishLocale(locale) ? "en" : "tr";
            ObjectNode out = objectMapper.createObjectNode();
            out.put("version", "natal_v2");
            out.put("tone", "scientific_warm");
            out.put("opening", buildDeterministicOpening(natal, resolvedLocale));
            out.put("coreSummary", buildDeterministicCoreSummary(natal, resolvedLocale));
            out.set("sections", buildDeterministicNatalSections(natal, resolvedLocale));
            out.set("planetHighlights", buildDeterministicPlanetHighlights(natal, resolvedLocale));
            out.put("closing", buildDeterministicClosing(natal, resolvedLocale));
            return objectMapper.writeValueAsString(out);
        } catch (Exception e) {
            logger.warn("Deterministic natal fallback generation failed: {}", e.getMessage());
            return "";
        }
    }

    private ArrayNode buildDeterministicNatalSections(NatalPayloadView natal, String locale) {
        ArrayNode sections = objectMapper.createArrayNode();

        sections.add(buildNatalSection(
                "core_portrait",
                isEnglishLocale(locale) ? "Cosmic Portrait Essence" : "Kozmik Portrenin Özü",
                buildCorePortraitBody(natal, locale),
                isEnglishLocale(locale)
                        ? "You notice this pattern when your first reaction and your deeper intention are not exactly the same."
                        : "Bu tema özellikle ilk tepkin ile derindeki niyetin tam örtüşmediğinde görünür olur.",
                isEnglishLocale(locale) ? "Main Identity Pattern" : "Ana Kimlik Deseni",
                buildCorePortraitBullet(natal, locale),
                isEnglishLocale(locale) ? "Outer Style" : "Dışa Yansıyan Tarz",
                buildRisingBullet(natal, locale),
                locale
        ));

        sections.add(buildNatalSection(
                "inner_conflicts",
                isEnglishLocale(locale) ? "Inner Conflicts and Power Centers" : "İç Çatışmalar ve Güç Merkezleri",
                buildInnerConflictBody(natal, locale),
                isEnglishLocale(locale)
                        ? "This pattern becomes visible when pressure rises and two equally valid needs pull in opposite directions."
                        : "Bu tema baskı arttığında ve iki gerçek ihtiyaç farklı yönlere çektiğinde belirginleşir.",
                isEnglishLocale(locale) ? "Primary Tension" : "Ana Gerilim",
                buildTensionBullet(natal, locale),
                isEnglishLocale(locale) ? "Growth Lever" : "Gelişim Kolu",
                isEnglishLocale(locale)
                        ? "Naming the real need before reacting turns friction into usable information."
                        : "Tepki vermeden önce asıl ihtiyacı isimlendirmek gerilimi kullanılabilir içgörüye dönüştürür.",
                locale
        ));

        sections.add(buildNatalSection(
                "natural_gifts",
                isEnglishLocale(locale) ? "Natural Gifts and Talents" : "Doğal Yetenekler ve Armağanlar",
                buildNaturalGiftsBody(natal, locale),
                isEnglishLocale(locale)
                        ? "This support pattern becomes obvious when you trust your natural rhythm instead of forcing the process."
                        : "Bu destekleyici tema, süreci zorlamak yerine doğal ritmine güvendiğinde daha görünür olur.",
                isEnglishLocale(locale) ? "Supportive Flow" : "Destekleyici Akış",
                buildSupportBullet(natal, locale),
                isEnglishLocale(locale) ? "Gift in Action" : "Çalışan Armağan",
                isEnglishLocale(locale)
                        ? "The chart gives you at least one area where growth comes with less resistance than expected."
                        : "Harita, gelişimin beklenenden daha az dirençle aktığı en az bir alan veriyor.",
                locale
        ));

        sections.add(buildNatalSection(
                "planetary_placements",
                isEnglishLocale(locale) ? "Planetary Placements" : "Gezegen Yerleşimleri",
                buildPlanetPlacementBody(natal, locale),
                isEnglishLocale(locale)
                        ? "Your thinking, relating, and action style shape the texture of ordinary days."
                        : "Düşünme, ilişki kurma ve hareket etme biçimin günlük hayatın dokusunu belirler.",
                isEnglishLocale(locale) ? "Mind and Speech" : "Zihin ve İfade",
                buildSpecificPlanetBullet(natal, "Mercury", locale),
                isEnglishLocale(locale) ? "Desire and Action" : "Arzu ve Hareket",
                buildVenusMarsBullet(natal, locale),
                locale
        ));

        sections.add(buildNatalSection(
                "career_purpose",
                isEnglishLocale(locale) ? "Career and Life Purpose" : "Kariyer ve Yaşam Amacı",
                buildCareerPurposeBody(natal, locale),
                isEnglishLocale(locale)
                        ? "You feel this most clearly when work needs both competence and a sense of meaning."
                        : "Bu tema en çok işin hem yetkinlik hem de anlam istediği dönemlerde hissedilir.",
                isEnglishLocale(locale) ? "Public Direction" : "Kamusal Yön",
                buildCareerBullet(natal, locale),
                isEnglishLocale(locale) ? "Long-Term Focus" : "Uzun Vadeli Odak",
                isEnglishLocale(locale)
                        ? "Your chart rewards consistency more than quick symbolic wins."
                        : "Haritan hızlı sembolik kazançlardan çok istikrarlı ilerlemeyi ödüllendiriyor.",
                locale
        ));

        sections.add(buildNatalSection(
                "relationship_dynamics",
                isEnglishLocale(locale) ? "Relationship Dynamics" : "İlişki Dinamikleri",
                buildRelationshipBody(natal, locale),
                isEnglishLocale(locale)
                        ? "This appears in the way closeness, boundaries, and expectations get negotiated with other people."
                        : "Bu tema, yakınlık, sınır ve beklenti dengesinin başka insanlarla nasıl kurulduğunda açığa çıkar.",
                isEnglishLocale(locale) ? "Partnership Style" : "Ortaklık Tarzı",
                buildRelationshipBullet(natal, locale),
                isEnglishLocale(locale) ? "Balance Point" : "Denge Noktası",
                isEnglishLocale(locale)
                        ? "Relationships work best when honesty and pacing are protected at the same time."
                        : "İlişkiler, dürüstlük ile tempo korunduğunda en sağlıklı akışını bulur.",
                locale
        ));

        sections.add(buildNatalSection(
                "spiritual_mission",
                isEnglishLocale(locale) ? "Spiritual Direction and North Node" : "Ruhsal Yön ve Kuzey Düğümü",
                buildSpiritualMissionBody(natal, locale),
                isEnglishLocale(locale)
                        ? "You feel this section most strongly in periods that ask for courage, healing, or a larger perspective."
                        : "Bu bölüm özellikle cesaret, şifa ve daha geniş bir perspektif isteyen dönemlerde hissedilir.",
                isEnglishLocale(locale) ? "Development Path" : "Gelişim Yolu",
                buildMissionBullet(natal, locale),
                isEnglishLocale(locale) ? "Inner Resource" : "İç Kaynak",
                isEnglishLocale(locale)
                        ? "The chart suggests that maturity arrives by integrating sensitivity with responsibility."
                        : "Harita, olgunlaşmanın hassasiyet ile sorumluluğu birlikte taşıyarak geldiğini gösteriyor.",
                locale
        ));

        return sections;
    }

    private ArrayNode buildDeterministicPlanetHighlights(NatalPayloadView natal, String locale) {
        ArrayNode highlights = objectMapper.createArrayNode();
        for (String planetName : List.of("Sun", "Moon", "Mercury", "Venus", "Mars")) {
            NatalPlanetView planet = findPlanet(natal, planetName);
            if (planet != null) {
                highlights.add(buildPlanetHighlight(planet, locale));
            }
        }
        return highlights;
    }

    private ObjectNode buildNatalSection(
            String id,
            String title,
            String body,
            String daily,
            String bullet1Title,
            String bullet1Detail,
            String bullet2Title,
            String bullet2Detail,
            String locale
    ) {
        ObjectNode section = objectMapper.createObjectNode();
        section.put("id", id);
        section.put("title", normalizeNatalUiTitle(title, title, locale));
        section.put("body", normalizeNatalParagraph(body, body, locale));
        section.put("dailyLifeExample", normalizeNatalParagraph(daily, daily, locale));
        ArrayNode bullets = objectMapper.createArrayNode();
        bullets.add(bullet(bullet1Title, bullet1Detail, locale));
        bullets.add(bullet(bullet2Title, bullet2Detail, locale));
        section.set("bulletPoints", bullets);
        return section;
    }

    private ObjectNode buildPlanetHighlight(NatalPlanetView planet, String locale) {
        String planetId = normalizePlanetId(planet.planet());
        String planetLabel = localizePlanet(planet.planet(), locale);
        String signLabel = localizeSign(planet.sign(), locale);
        String title = isEnglishLocale(locale)
                ? planetLabel + ": " + houseLabel(planet.house(), locale) + " expression"
                : planetLabel + ": " + planet.house() + ". ev ifadesi";

        String intro = isEnglishLocale(locale)
                ? planetLabel + " in " + signLabel + " works through " + signEssence(planet.sign(), locale) + "."
                : planetLabel + " " + signLabel + " burcunda " + signEssence(planet.sign(), locale) + " üzerinden çalışır.";
        String character = isEnglishLocale(locale)
                ? "Placed in the " + houseLabel(planet.house(), locale) + ", it links this planet to " + houseTheme(planet.house(), locale) + "."
                : houseLabel(planet.house(), locale) + " yerleşimi bu gezegeni " + houseTheme(planet.house(), locale) + " temalarına bağlar.";
        String depth = isEnglishLocale(locale)
                ? "Under stress it can slip into " + signShadow(planet.sign(), locale) + ", but awareness turns it into a practical strength."
                : "Zorlandığında " + signShadow(planet.sign(), locale) + " tarafına kayabilir; farkındalık bunu gerçek bir güce dönüştürür.";
        String daily = isEnglishLocale(locale)
                ? "You notice this when " + dailyCueForHouse(planet.house(), locale) + "."
                : "Bu yerleşim özellikle " + dailyCueForHouse(planet.house(), locale) + " anlarında görünür olur.";

        ObjectNode outNode = objectMapper.createObjectNode();
        outNode.put("planetId", planetId);
        outNode.put("title", normalizeNatalUiTitle(title, title, locale));
        outNode.put("intro", normalizeNatalParagraph(intro, intro, locale));
        outNode.put("character", normalizeNatalParagraph(character, character, locale));
        outNode.put("depth", normalizeNatalParagraph(depth, depth, locale));
        outNode.put("dailyLifeExample", normalizeNatalParagraph(daily, daily, locale));
        ArrayNode lines = objectMapper.createArrayNode();
        lines.add(analysisLine("sparkles", isEnglishLocale(locale) ? "Character Analysis" : "Karakter Analizi", intro, locale));
        lines.add(analysisLine("rocket", isEnglishLocale(locale) ? "How It Affects You" : "Seni Nasıl Etkiler?", character, locale));
        lines.add(analysisLine("warning", isEnglishLocale(locale) ? "Watch Out For" : "Dikkat Etmen Gerekenler", depth, locale));
        lines.add(analysisLine("star", isEnglishLocale(locale) ? "Key Strengths" : "Öne Çıkan Özellikler", daily, locale));
        outNode.set("analysisLines", lines);
        return outNode;
    }

    private String buildDeterministicOpening(NatalPayloadView natal, String locale) {
        NatalAspectView tension = findStrongestAspect(natal, List.of("SQUARE", "OPPOSITION"));
        NatalAspectView support = findStrongestAspect(natal, List.of("TRINE", "SEXTILE", "CONJUNCTION"));
        if (isEnglishLocale(locale)) {
            return normalizeNatalParagraph(
                    subjectLabel(natal, locale) + " blends " + localizeSign(natal.sunSign(), locale) + " purpose, "
                            + localizeSign(natal.moonSign(), locale) + " emotional needs, and a "
                            + localizeSign(natal.risingSign(), locale) + " rising style. "
                            + (tension != null ? "A major tension appears through " + describeAspect(tension, locale) + ". " : "")
                            + (support != null ? "A stabilizing gift comes through " + describeAspect(support, locale) + "." : "Support grows when curiosity and discipline cooperate."),
                    "",
                    locale
            );
        }
        return normalizeNatalParagraph(
                subjectLabel(natal, locale) + " içinde " + localizeSign(natal.sunSign(), locale) + " amacı, "
                        + localizeSign(natal.moonSign(), locale) + " duygusal ihtiyacı ve "
                        + localizeSign(natal.risingSign(), locale) + " yükselen tarzı bir araya geliyor. "
                        + (tension != null ? "Ana gerilim " + describeAspect(tension, locale) + " üzerinden hissediliyor. " : "")
                        + (support != null ? "Destekleyici akış ise " + describeAspect(support, locale) + " ile güçleniyor." : "Destekleyici taraf, merak ile disiplin birlikte çalıştığında görünür oluyor."),
                "",
                locale
        );
    }

    private String buildDeterministicCoreSummary(NatalPayloadView natal, String locale) {
        NatalPlanetView sun = findPlanet(natal, "Sun");
        NatalPlanetView moon = findPlanet(natal, "Moon");
        if (isEnglishLocale(locale)) {
            return normalizeNatalParagraph(
                    localizePlanet("Sun", locale) + " in " + localizeSign(natal.sunSign(), locale)
                            + (sun != null ? " in the " + houseLabel(sun.house(), locale) : "")
                            + " seeks " + signEssence(natal.sunSign(), locale) + ". "
                            + localizePlanet("Moon", locale) + " in " + localizeSign(natal.moonSign(), locale)
                            + (moon != null ? " in the " + houseLabel(moon.house(), locale) : "")
                            + " needs " + signEssence(natal.moonSign(), locale) + ". "
                            + localizeSign(natal.risingSign(), locale) + " rising makes your outer style feel " + signEssence(natal.risingSign(), locale) + ".",
                    "",
                    locale
            );
        }
        return normalizeNatalParagraph(
                localizePlanet("Güneş", locale) + " " + localizeSign(natal.sunSign(), locale)
                        + (sun != null ? " burcunda " + houseLabel(sun.house(), locale) + " yerleşimiyle" : " burcunda")
                        + " " + signEssence(natal.sunSign(), locale) + " arıyor. "
                        + localizePlanet("Ay", locale) + " " + localizeSign(natal.moonSign(), locale)
                        + (moon != null ? " burcunda " + houseLabel(moon.house(), locale) + " yerleşimiyle" : " burcunda")
                        + " " + signEssence(natal.moonSign(), locale) + " ihtiyacını büyütüyor. "
                        + localizeSign(natal.risingSign(), locale) + " yükseleni ise dış dünyaya " + signEssence(natal.risingSign(), locale) + " tonunu taşıyor.",
                "",
                locale
        );
    }

    private String buildDeterministicClosing(NatalPayloadView natal, String locale) {
        return isEnglishLocale(locale)
                ? "This chart works best as a practical awareness tool. When you name the tension, use the gift, and respect your pacing, the pattern becomes much easier to live with."
                : "Bu harita en iyi, pratik bir farkındalık aracı gibi kullanıldığında çalışır. Gerilimi isimlendirip armağanı bilinçli kullandığında ve kendi ritmine saygı duyduğunda desen çok daha yönetilebilir hale gelir.";
    }

    private String buildCorePortraitBody(NatalPayloadView natal, String locale) {
        NatalPlanetView sun = findPlanet(natal, "Sun");
        NatalPlanetView moon = findPlanet(natal, "Moon");
        if (isEnglishLocale(locale)) {
            return localizePlanet("Sun", locale) + " in " + localizeSign(natal.sunSign(), locale)
                    + (sun != null ? " in the " + houseLabel(sun.house(), locale) : "")
                    + " ties identity to " + houseTheme(sun != null ? sun.house() : 1, locale) + " and to " + signEssence(natal.sunSign(), locale) + ". "
                    + localizePlanet("Moon", locale) + " in " + localizeSign(natal.moonSign(), locale)
                    + (moon != null ? " in the " + houseLabel(moon.house(), locale) : "")
                    + " adds emotional needs around " + houseTheme(moon != null ? moon.house() : 4, locale) + ". "
                    + localizeSign(natal.risingSign(), locale) + " rising gives your first impression a " + signEssence(natal.risingSign(), locale) + " tone, so people may meet your flexibility before they see your deeper commitments.";
        }
        return localizePlanet("Sun", locale) + " " + localizeSign(natal.sunSign(), locale)
                + (sun != null ? " burcunda " + houseLabel(sun.house(), locale) + " yerleşimiyle" : " burcunda")
                + " kimliği " + houseTheme(sun != null ? sun.house() : 1, locale) + " ve " + signEssence(natal.sunSign(), locale) + " üzerinden kuruyor. "
                + localizePlanet("Moon", locale) + " " + localizeSign(natal.moonSign(), locale)
                + (moon != null ? " burcunda " + houseLabel(moon.house(), locale) + " yerleşimiyle" : " burcunda")
                + " duygusal ihtiyacı " + houseTheme(moon != null ? moon.house() : 4, locale) + " alanına taşıyor. "
                + localizeSign(natal.risingSign(), locale) + " yükseleni ise ilk izlenimde " + signEssence(natal.risingSign(), locale) + " tonunu öne çıkarıyor; insanlar önce hareketliliğini görüp alttaki kararlılığı sonra fark edebilir.";
    }

    private String buildInnerConflictBody(NatalPayloadView natal, String locale) {
        NatalAspectView tension = findStrongestAspect(natal, List.of("SQUARE", "OPPOSITION"));
        if (tension == null) {
            return isEnglishLocale(locale)
                    ? "Your chart is less about one dramatic fracture and more about pacing different needs without losing coherence."
                    : "Haritan tek bir dramatik kırılmadan çok, farklı ihtiyaçları aynı ritimde taşıma becerisi etrafında çalışıyor.";
        }
        NatalPlanetView planet1 = findPlanet(natal, tension.planet1());
        NatalPlanetView planet2 = findPlanet(natal, tension.planet2());
        if (isEnglishLocale(locale)) {
            return describeAspect(tension, locale) + " suggests friction between "
                    + houseTheme(planet1 != null ? planet1.house() : 1, locale) + " and "
                    + houseTheme(planet2 != null ? planet2.house() : 7, locale) + ". "
                    + "This does not remove your strengths; it asks you to slow down long enough to understand which need is actually speaking first.";
        }
        return describeAspect(tension, locale) + " özellikle "
                + houseTheme(planet1 != null ? planet1.house() : 1, locale) + " ile "
                + houseTheme(planet2 != null ? planet2.house() : 7, locale) + " arasında bir sürtünme yaratıyor. "
                + "Bu gerilim gücü ortadan kaldırmaz; sadece ilk konuşan ihtiyacın hangisi olduğunu daha bilinçli duymanı ister.";
    }

    private String buildNaturalGiftsBody(NatalPayloadView natal, String locale) {
        NatalAspectView support = findStrongestAspect(natal, List.of("TRINE", "SEXTILE", "CONJUNCTION"));
        if (support == null) {
            return isEnglishLocale(locale)
                    ? "The chart still shows usable gifts: endurance, pattern recognition, and an ability to learn through experience."
                    : "Harita yine de kullanılabilir armağanlar veriyor: dayanıklılık, örüntü fark etme ve deneyimden öğrenme kapasitesi.";
        }
        NatalPlanetView planet1 = findPlanet(natal, support.planet1());
        NatalPlanetView planet2 = findPlanet(natal, support.planet2());
        if (isEnglishLocale(locale)) {
            return describeAspect(support, locale) + " creates a more natural flow between "
                    + houseTheme(planet1 != null ? planet1.house() : 1, locale) + " and "
                    + houseTheme(planet2 != null ? planet2.house() : 9, locale) + ". "
                    + "This is a place where your effort is usually rewarded faster because the chart is already wired for cooperation here.";
        }
        return describeAspect(support, locale) + " "
                + houseTheme(planet1 != null ? planet1.house() : 1, locale) + " ile "
                + houseTheme(planet2 != null ? planet2.house() : 9, locale) + " arasında daha doğal bir akış yaratıyor. "
                + "Burada emek daha hızlı karşılık bulur; çünkü haritan bu alanda işbirliğine zaten yatkın çalışıyor.";
    }

    private String buildPlanetPlacementBody(NatalPayloadView natal, String locale) {
        NatalPlanetView mercury = findPlanet(natal, "Mercury");
        NatalPlanetView venus = findPlanet(natal, "Venus");
        NatalPlanetView mars = findPlanet(natal, "Mars");
        List<String> parts = new ArrayList<>();
        if (mercury != null) {
            parts.add(isEnglishLocale(locale)
                    ? localizePlanet("Mercury", locale) + " in " + localizeSign(mercury.sign(), locale) + " thinks through " + signEssence(mercury.sign(), locale) + "."
                    : localizePlanet("Mercury", locale) + " " + localizeSign(mercury.sign(), locale) + " burcunda " + signEssence(mercury.sign(), locale) + " üzerinden düşünür.");
        }
        if (venus != null) {
            parts.add(isEnglishLocale(locale)
                    ? localizePlanet("Venus", locale) + " in " + localizeSign(venus.sign(), locale) + " values " + signEssence(venus.sign(), locale) + "."
                    : localizePlanet("Venus", locale) + " " + localizeSign(venus.sign(), locale) + " burcunda " + signEssence(venus.sign(), locale) + " değerini büyütür.");
        }
        if (mars != null) {
            parts.add(isEnglishLocale(locale)
                    ? localizePlanet("Mars", locale) + " in " + localizeSign(mars.sign(), locale) + " acts through " + signEssence(mars.sign(), locale) + "."
                    : localizePlanet("Mars", locale) + " " + localizeSign(mars.sign(), locale) + " burcunda " + signEssence(mars.sign(), locale) + " ile harekete geçer.");
        }
        return String.join(" ", parts);
    }

    private String buildCareerPurposeBody(NatalPayloadView natal, String locale) {
        NatalHouseView tenthHouse = findHouse(natal, 10);
        List<NatalPlanetView> tenthHousePlanets = planetsInHouse(natal, 10);
        String planetList = localizePlanetList(tenthHousePlanets, locale);
        if (isEnglishLocale(locale)) {
            return "The " + houseLabel(10, locale) + " begins in "
                    + localizeSign(tenthHouse != null ? tenthHouse.sign() : "Capricorn", locale)
                    + ", so vocation asks for " + signEssence(tenthHouse != null ? tenthHouse.sign() : "Capricorn", locale) + ". "
                    + (!planetList.isBlank()
                    ? "Visible career themes are reinforced by " + planetList + ". "
                    : "")
                    + "Your public direction becomes stronger when responsibility and originality can coexist.";
        }
        return houseLabel(10, locale) + " başlangıcı "
                + localizeSign(tenthHouse != null ? tenthHouse.sign() : "Capricorn", locale)
                + " burcunda olduğu için mesleki yön " + signEssence(tenthHouse != null ? tenthHouse.sign() : "Capricorn", locale) + " ister. "
                + (!planetList.isBlank() ? "Görünür kariyer temaları " + planetList + " ile daha da vurgulanır. " : "")
                + "Kamusal yönün, sorumluluk ile özgünlük birlikte taşındığında güçlenir.";
    }

    private String buildRelationshipBody(NatalPayloadView natal, String locale) {
        NatalHouseView seventhHouse = findHouse(natal, 7);
        List<NatalPlanetView> seventhHousePlanets = planetsInHouse(natal, 7);
        String planetList = localizePlanetList(seventhHousePlanets, locale);
        if (isEnglishLocale(locale)) {
            return "The " + houseLabel(7, locale) + " begins in "
                    + localizeSign(seventhHouse != null ? seventhHouse.sign() : "Libra", locale)
                    + ", so partnership themes ask for " + signEssence(seventhHouse != null ? seventhHouse.sign() : "Libra", locale) + ". "
                    + (!planetList.isBlank() ? "Relationships are further colored by " + planetList + ". " : "")
                    + "The main lesson is not only closeness, but also pacing and clarity.";
        }
        return houseLabel(7, locale) + " başlangıcı "
                + localizeSign(seventhHouse != null ? seventhHouse.sign() : "Libra", locale)
                + " burcunda olduğu için ilişkiler " + signEssence(seventhHouse != null ? seventhHouse.sign() : "Libra", locale) + " talep eder. "
                + (!planetList.isBlank() ? "İlişki dinamiği ayrıca " + planetList + " ile renklidir. " : "")
                + "Ana ders yalnızca yakınlık değil; tempo ve netlik kurabilmektir.";
    }

    private String buildSpiritualMissionBody(NatalPayloadView natal, String locale) {
        NatalPlanetView northNode = findPlanet(natal, "NorthNode");
        NatalPlanetView chiron = findPlanet(natal, "Chiron");
        if (isEnglishLocale(locale)) {
            return (northNode != null
                    ? localizePlanet("NorthNode", locale) + " in " + localizeSign(northNode.sign(), locale) + " points toward growth through "
                    + houseTheme(northNode.house(), locale) + ". "
                    : "The growth path in this chart becomes clearer when you stop repeating what feels safe but emotionally small. ")
                    + (chiron != null
                    ? localizePlanet("Chiron", locale) + " shows that healing is tied to " + houseTheme(chiron.house(), locale) + " and to learning a gentler relationship with vulnerability."
                    : "A big part of maturity here comes from treating sensitivity as information instead of as weakness.");
        }
        return (northNode != null
                ? localizePlanet("NorthNode", locale) + " " + localizeSign(northNode.sign(), locale) + " burcunda gelişimin "
                + houseTheme(northNode.house(), locale) + " üzerinden çağrıldığını gösteriyor. "
                : "Bu haritada gelişim yolu, güvenli ama dar gelen kalıpları tekrar etmek yerine daha büyük bir ufka açıldığında netleşir. ")
                + (chiron != null
                ? localizePlanet("Chiron", locale) + " ise şifanın " + houseTheme(chiron.house(), locale) + " alanı ve kırılganlıkla daha yumuşak ilişki kurmakla bağlantılı olduğunu anlatıyor."
                : "Olgunlaşmanın önemli bir kısmı, hassasiyeti zayıflık değil veri gibi kullanabilmekten geçiyor.");
    }

    private String buildCorePortraitBullet(NatalPayloadView natal, String locale) {
        NatalPlanetView sun = findPlanet(natal, "Sun");
        return isEnglishLocale(locale)
                ? "The chart centers identity around " + houseTheme(sun != null ? sun.house() : 1, locale) + " with a " + localizeSign(natal.sunSign(), locale) + " tone."
                : "Harita kimliği " + houseTheme(sun != null ? sun.house() : 1, locale) + " alanında " + localizeSign(natal.sunSign(), locale) + " tonuyla merkeze alıyor.";
    }

    private String buildRisingBullet(NatalPayloadView natal, String locale) {
        return isEnglishLocale(locale)
                ? localizeSign(natal.risingSign(), locale) + " rising often makes you look " + signEssence(natal.risingSign(), locale) + " before your deeper motives are obvious."
                : localizeSign(natal.risingSign(), locale) + " yükseleni, derindeki motivasyonlar görünmeden önce seni " + signEssence(natal.risingSign(), locale) + " gösterir.";
    }

    private String buildTensionBullet(NatalPayloadView natal, String locale) {
        NatalAspectView tension = findStrongestAspect(natal, List.of("SQUARE", "OPPOSITION"));
        if (tension == null) {
            return isEnglishLocale(locale)
                    ? "The pressure is subtle but recurring: different needs may ask for different timing."
                    : "Gerilim ince ama tekrar edebilir; farklı ihtiyaçlar farklı tempo isteyebilir.";
        }
        return isEnglishLocale(locale)
                ? describeAspect(tension, locale) + " is the clearest training ground in the chart."
                : describeAspect(tension, locale) + " haritadaki en belirgin eğitim alanını oluşturuyor.";
    }

    private String buildSupportBullet(NatalPayloadView natal, String locale) {
        NatalAspectView support = findStrongestAspect(natal, List.of("TRINE", "SEXTILE", "CONJUNCTION"));
        if (support == null) {
            return isEnglishLocale(locale)
                    ? "The main gift is endurance: you can build skill by repetition."
                    : "Ana armağan dayanıklılık: tekrar ederek beceri inşa edebilirsin.";
        }
        return isEnglishLocale(locale)
                ? describeAspect(support, locale) + " gives one of the chart's easiest resource channels."
                : describeAspect(support, locale) + " haritanın en rahat çalışan kaynak kanallarından birini veriyor.";
    }

    private String buildSpecificPlanetBullet(NatalPayloadView natal, String planetName, String locale) {
        NatalPlanetView planet = findPlanet(natal, planetName);
        if (planet == null) {
            return isEnglishLocale(locale)
                    ? "Mental style becomes clearer when you watch how you organize information under pressure."
                    : "Zihinsel tarzın, baskı altında bilgiyi nasıl organize ettiğine baktığında daha net görünür.";
        }
        return isEnglishLocale(locale)
                ? localizePlanet(planetName, locale) + " works through " + signEssence(planet.sign(), locale) + " in " + houseLabel(planet.house(), locale) + "."
                : localizePlanet(planetName, locale) + " " + signEssence(planet.sign(), locale) + " ile " + houseLabel(planet.house(), locale) + " alanında çalışır.";
    }

    private String buildVenusMarsBullet(NatalPayloadView natal, String locale) {
        NatalPlanetView venus = findPlanet(natal, "Venus");
        NatalPlanetView mars = findPlanet(natal, "Mars");
        if (isEnglishLocale(locale)) {
            return (venus != null ? localizePlanet("Venus", locale) + " seeks " + signEssence(venus.sign(), locale) + ". " : "")
                    + (mars != null ? localizePlanet("Mars", locale) + " acts through " + signEssence(mars.sign(), locale) + "." : "");
        }
        return (venus != null ? localizePlanet("Venus", locale) + " " + signEssence(venus.sign(), locale) + " ister. " : "")
                + (mars != null ? localizePlanet("Mars", locale) + " " + signEssence(mars.sign(), locale) + " ile harekete geçer." : "");
    }

    private String buildCareerBullet(NatalPayloadView natal, String locale) {
        NatalHouseView tenthHouse = findHouse(natal, 10);
        return isEnglishLocale(locale)
                ? "Career gains momentum when " + localizeSign(tenthHouse != null ? tenthHouse.sign() : "Capricorn", locale) + " qualities are used consciously."
                : "Kariyer, " + localizeSign(tenthHouse != null ? tenthHouse.sign() : "Capricorn", locale) + " özellikleri bilinçli kullanıldığında daha fazla ivme kazanır.";
    }

    private String buildRelationshipBullet(NatalPayloadView natal, String locale) {
        NatalHouseView seventhHouse = findHouse(natal, 7);
        return isEnglishLocale(locale)
                ? "Partnership mirrors become stronger around " + houseTheme(seventhHouse != null ? 7 : 7, locale) + "."
                : "İlişki aynaları özellikle " + houseTheme(seventhHouse != null ? 7 : 7, locale) + " alanında daha görünür hale gelir.";
    }

    private String buildMissionBullet(NatalPayloadView natal, String locale) {
        NatalPlanetView northNode = findPlanet(natal, "NorthNode");
        if (northNode == null) {
            return isEnglishLocale(locale)
                    ? "Growth appears when you move toward a wider life perspective instead of repeating old defenses."
                    : "Gelişim, eski savunmaları tekrar etmek yerine daha geniş bir yaşam perspektifine açıldığında görünür olur.";
        }
        return isEnglishLocale(locale)
                ? localizePlanet("NorthNode", locale) + " directs growth toward " + houseTheme(northNode.house(), locale) + "."
                : localizePlanet("NorthNode", locale) + " gelişimi " + houseTheme(northNode.house(), locale) + " alanına yönlendirir.";
    }

    private NatalPlanetView findPlanet(NatalPayloadView natal, String planetName) {
        if (natal == null || natal.planets() == null) return null;
        for (NatalPlanetView planet : natal.planets()) {
            if (planet != null && nonBlank(planet.planet()) && planet.planet().equalsIgnoreCase(planetName)) {
                return planet;
            }
        }
        return null;
    }

    private NatalHouseView findHouse(NatalPayloadView natal, int houseNumber) {
        if (natal == null || natal.houses() == null) return null;
        for (NatalHouseView house : natal.houses()) {
            if (house != null && house.houseNumber() == houseNumber) {
                return house;
            }
        }
        return null;
    }

    private List<NatalPlanetView> planetsInHouse(NatalPayloadView natal, int houseNumber) {
        List<NatalPlanetView> planets = new ArrayList<>();
        if (natal == null || natal.planets() == null) return planets;
        for (NatalPlanetView planet : natal.planets()) {
            if (planet != null && planet.house() == houseNumber) {
                planets.add(planet);
            }
        }
        return planets;
    }

    private NatalAspectView findStrongestAspect(NatalPayloadView natal, List<String> types) {
        if (natal == null || natal.aspects() == null) return null;
        NatalAspectView winner = null;
        for (NatalAspectView aspect : natal.aspects()) {
            if (aspect == null || !nonBlank(aspect.type()) || !types.contains(aspect.type().toUpperCase(Locale.ROOT))) {
                continue;
            }
            if (winner == null || aspect.orb() < winner.orb()) {
                winner = aspect;
            }
        }
        return winner;
    }

    private String localizePlanetList(List<NatalPlanetView> planets, String locale) {
        if (planets == null || planets.isEmpty()) return "";
        List<String> names = new ArrayList<>();
        for (NatalPlanetView planet : planets) {
            if (planet != null && nonBlank(planet.planet())) {
                names.add(localizePlanet(planet.planet(), locale));
            }
        }
        if (names.isEmpty()) return "";
        if (names.size() == 1) return names.getFirst();
        if (names.size() == 2) {
            return names.get(0) + (isEnglishLocale(locale) ? " and " : " ve ") + names.get(1);
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < names.size(); i++) {
            if (i > 0) {
                sb.append(i == names.size() - 1 ? (isEnglishLocale(locale) ? ", and " : " ve ") : ", ");
            }
            sb.append(names.get(i));
        }
        return sb.toString();
    }

    private String describeAspect(NatalAspectView aspect, String locale) {
        if (aspect == null) return "";
        String p1 = localizePlanet(aspect.planet1(), locale);
        String p2 = localizePlanet(aspect.planet2(), locale);
        String label = localizeAspect(aspect.type(), locale);
        String orb = String.format(Locale.US, "%.2f", aspect.orb());
        if (isEnglishLocale(locale)) {
            return "the " + p1 + "-" + p2 + " " + label + " (orb " + orb + "°)";
        }
        return p1 + " ile " + p2 + " arasındaki " + label + " (orb " + orb + "°)";
    }

    private String localizeAspect(String type, String locale) {
        String normalized = type == null ? "" : type.toUpperCase(Locale.ROOT);
        if (isEnglishLocale(locale)) {
            return switch (normalized) {
                case "CONJUNCTION" -> "conjunction";
                case "SEXTILE" -> "sextile";
                case "SQUARE" -> "square";
                case "TRINE" -> "trine";
                case "OPPOSITION" -> "opposition";
                default -> "aspect";
            };
        }
        return switch (normalized) {
            case "CONJUNCTION" -> "kavuşum";
            case "SEXTILE" -> "altmışlık";
            case "SQUARE" -> "kare";
            case "TRINE" -> "üçgen";
            case "OPPOSITION" -> "karşıt";
            default -> "açı";
        };
    }

    private String localizePlanet(String planet, String locale) {
        String normalized = planet == null ? "" : planet.trim().toLowerCase(Locale.ROOT).replace(" ", "");
        if (isEnglishLocale(locale)) {
            return switch (normalized) {
                case "sun", "güneş", "gunes" -> "Sun";
                case "moon", "ay" -> "Moon";
                case "mercury", "merkür", "merkur" -> "Mercury";
                case "venus", "venüs" -> "Venus";
                case "mars" -> "Mars";
                case "jupiter", "jüpiter" -> "Jupiter";
                case "saturn", "satürn" -> "Saturn";
                case "uranus", "uranüs" -> "Uranus";
                case "neptune", "neptün" -> "Neptune";
                case "pluto", "plüton" -> "Pluto";
                case "chiron", "kiron" -> "Chiron";
                case "northnode", "north_node", "kuzeydüğümü", "kuzeydugumu", "kuzeydügümü" -> "North Node";
                default -> planet;
            };
        }
        return switch (normalized) {
            case "sun", "güneş", "gunes" -> "Güneş";
            case "moon", "ay" -> "Ay";
            case "mercury", "merkür", "merkur" -> "Merkür";
            case "venus", "venüs" -> "Venüs";
            case "mars" -> "Mars";
            case "jupiter", "jüpiter" -> "Jüpiter";
            case "saturn", "satürn" -> "Satürn";
            case "uranus", "uranüs" -> "Uranüs";
            case "neptune", "neptün" -> "Neptün";
            case "pluto", "plüton" -> "Plüton";
            case "chiron", "kiron" -> "Kiron";
            case "northnode", "north_node", "kuzeydüğümü", "kuzeydügümü" -> "Kuzey Düğümü";
            default -> planet;
        };
    }

    private String localizeSign(String sign, String locale) {
        String normalized = sign == null ? "" : sign.trim().toLowerCase(Locale.ROOT);
        if (isEnglishLocale(locale)) {
            return switch (normalized) {
                case "koç", "koc", "aries" -> "Aries";
                case "boğa", "boga", "taurus" -> "Taurus";
                case "ikizler", "gemini" -> "Gemini";
                case "yengeç", "yengec", "cancer" -> "Cancer";
                case "aslan", "leo" -> "Leo";
                case "başak", "basak", "virgo" -> "Virgo";
                case "terazi", "libra" -> "Libra";
                case "akrep", "scorpio" -> "Scorpio";
                case "yay", "sagittarius" -> "Sagittarius";
                case "oğlak", "oglak", "capricorn" -> "Capricorn";
                case "kova", "aquarius" -> "Aquarius";
                case "balık", "balik", "pisces" -> "Pisces";
                default -> sign;
            };
        }
        return switch (normalized) {
            case "aries", "koç", "koc" -> "Koç";
            case "taurus", "boğa", "boga" -> "Boğa";
            case "gemini", "ikizler" -> "İkizler";
            case "cancer", "yengeç", "yengec" -> "Yengeç";
            case "leo", "aslan" -> "Aslan";
            case "virgo", "başak", "basak" -> "Başak";
            case "libra", "terazi" -> "Terazi";
            case "scorpio", "akrep" -> "Akrep";
            case "sagittarius", "yay" -> "Yay";
            case "capricorn", "oğlak", "oglak" -> "Oğlak";
            case "aquarius", "kova" -> "Kova";
            case "pisces", "balık", "balik" -> "Balık";
            default -> sign;
        };
    }

    private String signEssence(String sign, String locale) {
        String normalized = localizeSign(sign, "en").toLowerCase(Locale.ROOT);
        if (isEnglishLocale(locale)) {
            return switch (normalized) {
                case "aries" -> "direct action, courage, and initiative";
                case "taurus" -> "stability, patience, and tangible security";
                case "gemini" -> "curiosity, dialogue, and flexibility";
                case "cancer" -> "protection, memory, and emotional bonding";
                case "leo" -> "heart-led expression, pride, and creativity";
                case "virgo" -> "analysis, refinement, and useful precision";
                case "libra" -> "balance, diplomacy, and relational awareness";
                case "scorpio" -> "depth, intensity, and emotional truth";
                case "sagittarius" -> "meaning, openness, and larger vision";
                case "capricorn" -> "discipline, strategy, and long-term responsibility";
                case "aquarius" -> "perspective, originality, and independent thinking";
                case "pisces" -> "sensitivity, imagination, and spiritual permeability";
                default -> "a distinct psychological tone";
            };
        }
        return switch (normalized) {
            case "aries" -> "doğrudan hareket, cesaret ve başlangıç dürtüsü";
            case "taurus" -> "istikrar, sabır ve somut güven";
            case "gemini" -> "merak, diyalog ve esneklik";
            case "cancer" -> "koruma, hafıza ve duygusal bağ";
            case "leo" -> "kalpten ifade, gurur ve yaratıcılık";
            case "virgo" -> "analiz, incelik ve işe yarayan düzen";
            case "libra" -> "denge, diplomasi ve ilişki farkındalığı";
            case "scorpio" -> "derinlik, yoğunluk ve duygusal hakikat";
            case "sagittarius" -> "anlam, açıklık ve geniş vizyon";
            case "capricorn" -> "disiplin, strateji ve uzun vadeli sorumluluk";
            case "aquarius" -> "perspektif, özgünlük ve bağımsız düşünce";
            case "pisces" -> "hassasiyet, hayal gücü ve ruhsal geçirgenlik";
            default -> "ayırt edici bir psikolojik ton";
        };
    }

    private String signShadow(String sign, String locale) {
        String normalized = localizeSign(sign, "en").toLowerCase(Locale.ROOT);
        if (isEnglishLocale(locale)) {
            return switch (normalized) {
                case "aries" -> "impulsiveness and unnecessary combat";
                case "taurus" -> "rigidity and over-attachment to comfort";
                case "gemini" -> "scattered attention and over-talking";
                case "cancer" -> "withdrawal and emotional defensiveness";
                case "leo" -> "hurt pride and dramatic reactions";
                case "virgo" -> "over-criticism and perfection pressure";
                case "libra" -> "people-pleasing and indecision";
                case "scorpio" -> "control, secrecy, and intensity overload";
                case "sagittarius" -> "restlessness and avoidance of detail";
                case "capricorn" -> "hardness, over-control, and pessimism";
                case "aquarius" -> "distance and emotional detachment";
                case "pisces" -> "confusion, over-absorption, and blurred limits";
                default -> "an unbalanced expression";
            };
        }
        return switch (normalized) {
            case "aries" -> "dürtüsellik ve gereksiz mücadele";
            case "taurus" -> "katılık ve konfora aşırı tutunma";
            case "gemini" -> "dağınık dikkat ve fazla konuşma";
            case "cancer" -> "geri çekilme ve duygusal savunma";
            case "leo" -> "incinmiş gurur ve dramatik tepkiler";
            case "virgo" -> "aşırı eleştiri ve mükemmellik baskısı";
            case "libra" -> "memnun etme zorunluluğu ve kararsızlık";
            case "scorpio" -> "kontrol, gizlilik ve yoğunluk yükü";
            case "sagittarius" -> "huzursuzluk ve detaydan kaçış";
            case "capricorn" -> "sertlik, aşırı kontrol ve karamsarlık";
            case "aquarius" -> "mesafe ve duygusal kopukluk";
            case "pisces" -> "bulanıklık, aşırı etkilenme ve sınır kaybı";
            default -> "dengesiz bir ifade";
        };
    }

    private String houseTheme(int house, String locale) {
        if (isEnglishLocale(locale)) {
            return switch (house) {
                case 1 -> "identity, body, and first impressions";
                case 2 -> "money, values, and security";
                case 3 -> "learning, communication, and immediate environment";
                case 4 -> "home, family, and roots";
                case 5 -> "creativity, pleasure, and self-expression";
                case 6 -> "work, health, and daily systems";
                case 7 -> "partnership, mirrors, and agreements";
                case 8 -> "intimacy, shared resources, and transformation";
                case 9 -> "belief, study, travel, and perspective";
                case 10 -> "career, status, and public direction";
                case 11 -> "community, friendship, and future plans";
                case 12 -> "inner life, closure, rest, and retreat";
                default -> "important life themes";
            };
        }
        return switch (house) {
            case 1 -> "kimlik, beden ve ilk izlenim";
            case 2 -> "para, değer ve güven";
            case 3 -> "öğrenme, iletişim ve yakın çevre";
            case 4 -> "ev, aile ve kökler";
            case 5 -> "yaratıcılık, keyif ve öz ifade";
            case 6 -> "iş, sağlık ve günlük düzen";
            case 7 -> "ortaklık, aynalar ve anlaşmalar";
            case 8 -> "yakınlık, paylaşılan kaynaklar ve dönüşüm";
            case 9 -> "inanç, eğitim, seyahat ve perspektif";
            case 10 -> "kariyer, statü ve kamusal yön";
            case 11 -> "topluluk, arkadaşlık ve gelecek planları";
            case 12 -> "iç dünya, kapanış, dinlenme ve geri çekilme";
            default -> "önemli yaşam temaları";
        };
    }

    private String dailyCueForHouse(int house, String locale) {
        if (isEnglishLocale(locale)) {
            return switch (house) {
                case 1 -> "you step into a room and immediately shape the tone";
                case 2 -> "money, self-worth, or practical priorities are on the table";
                case 3 -> "you have to explain something quickly and clearly";
                case 4 -> "family, home, or emotional safety needs attention";
                case 5 -> "you want to create, flirt, play, or take a personal risk";
                case 6 -> "routines, deadlines, or body signals need a response";
                case 7 -> "another person reflects your needs back to you";
                case 8 -> "trust, sharing, or control becomes a sensitive topic";
                case 9 -> "you are reframing a belief or seeking a wider perspective";
                case 10 -> "public visibility, work, or authority is involved";
                case 11 -> "group dynamics or long-term plans become active";
                case 12 -> "you need silence, recovery, or emotional decompression";
                default -> "a familiar life pattern repeats";
            };
        }
        return switch (house) {
            case 1 -> "bir ortama girip tonu hızlıca belirlediğinde";
            case 2 -> "para, öz değer ya da pratik öncelikler gündeme geldiğinde";
            case 3 -> "bir şeyi hızlı ve net anlatman gerektiğinde";
            case 4 -> "aile, ev ya da duygusal güvenlik dikkat istediğinde";
            case 5 -> "yaratmak, flört etmek ya da kişisel risk almak istediğinde";
            case 6 -> "rutinler, son tarihler ya da beden sinyalleri cevap istediğinde";
            case 7 -> "başka bir insan ihtiyaçlarını sana geri yansıttığında";
            case 8 -> "güven, paylaşım ya da kontrol hassas bir konu olduğunda";
            case 9 -> "bir inancı yeniden çerçevelediğinde ya da ufkunu genişletmek istediğinde";
            case 10 -> "kamusal görünürlük, iş ya da otorite devreye girdiğinde";
            case 11 -> "grup dinamiği ya da uzun vadeli planlar hareketlendiğinde";
            case 12 -> "sessizlik, toparlanma ya da duygusal boşalma ihtiyacı doğduğunda";
            default -> "tanıdık bir yaşam deseni tekrarlandığında";
        };
    }

    private String houseLabel(int house, String locale) {
        if (isEnglishLocale(locale)) {
            return ordinal(house) + " House";
        }
        return house + ". ev";
    }

    private String ordinal(int value) {
        int mod100 = value % 100;
        if (mod100 >= 11 && mod100 <= 13) return value + "th";
        return switch (value % 10) {
            case 1 -> value + "st";
            case 2 -> value + "nd";
            case 3 -> value + "rd";
            default -> value + "th";
        };
    }

    private String subjectLabel(NatalPayloadView natal, String locale) {
        if (natal == null || !nonBlank(natal.name())) {
            return isEnglishLocale(locale) ? "This chart" : "Bu harita";
        }
        return isEnglishLocale(locale) ? natal.name() + "'s chart" : natal.name() + " için bu harita";
    }

    private String text(JsonNode node, String field) {
        if (node == null || field == null || !node.has(field) || node.get(field).isNull()) return "";
        JsonNode v = node.get(field);
        if (v.isTextual()) return v.asText();
        if (v.isNumber() || v.isBoolean()) return v.asText();
        return "";
    }

    private String firstNonBlank(String... values) {
        if (values == null) return "";
        for (String v : values) {
            if (nonBlank(v)) return v;
        }
        return "";
    }

    private boolean nonBlank(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String truncate(String value, int max) {
        if (value == null) return "";
        String s = value.trim();
        if (s.length() <= max) return s;
        if (max <= 1) return s.substring(0, Math.max(0, max));
        return s.substring(0, max - 1).trim() + "…";
    }

    private String toTitleCase(String value) {
        if (!nonBlank(value)) return "";
        String[] parts = value.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (part.isEmpty()) continue;
            if (sb.length() > 0) sb.append(' ');
            sb.append(Character.toUpperCase(part.charAt(0)));
            if (part.length() > 1) sb.append(part.substring(1));
        }
        return sb.toString();
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
                .replace("Sun",         "Güneş")
                .replace("Moon",        "Ay")
                .replace("Jupiter",     "Jüpiter")
                .replace("Saturn",      "Satürn")
                .replace("Uranus",      "Uranüs")
                .replace("Neptune",     "Neptün")
                .replace("Pluto",       "Plüton")
                .replace("Chiron",      "Kiron")
                .replace("Kheiron",     "Kiron")
                // Aspects
                .replace("Conjunction", "Kavuşum")
                .replace("Sextile",     "Altmışlık")
                .replace("Trine",       "Üçgen")
                .replace("Square",      "Kare")
                .replace("Opposition",  "Karşıt")
                .replace("Quincunx",    "Quincunx (Uyumsuz Ayar)")
                .replace("Inconjunct",  "Quincunx (Uyumsuz Ayar)");
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

    private record NatalPayloadView(
            Long chartId,
            String name,
            String sunSign,
            String moonSign,
            String risingSign,
            double ascendantDegree,
            List<NatalPlanetView> planets,
            List<NatalHouseView> houses,
            List<NatalAspectView> aspects,
            List<String> currentTransitSummary,
            String locale
    ) {}

    private record NatalPlanetView(
            String planet,
            String sign,
            double degree,
            int minutes,
            int seconds,
            boolean retrograde,
            int house,
            double absoluteLongitude
    ) {}

    private record NatalHouseView(
            int houseNumber,
            String sign,
            double degree,
            String ruler
    ) {}

    private record NatalAspectView(
            String planet1,
            String planet2,
            String type,
            double angle,
            double orb
    ) {}
}
