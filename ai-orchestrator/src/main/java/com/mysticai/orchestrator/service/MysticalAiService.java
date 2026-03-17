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
                response = normalizeNatalChartJson(response);
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
    private String normalizeNatalChartJson(String response) {
        try {
            JsonNode parsed = tryParseNatalJsonObject(response);
            if (parsed == null || !parsed.isObject()) {
                logger.warn("Natal JSON normalization: response is not an object, building fallback envelope");
                return buildFallbackNatalJson(response);
            }

            ObjectNode root = (ObjectNode) parsed;
            ObjectNode out = objectMapper.createObjectNode();
            out.put("version", "natal_v2");
            out.put("tone", nonBlank(text(root, "tone")) ? text(root, "tone") : "scientific_warm");
            out.put("opening", normalizeParagraph(text(root, "opening"),
                    "Haritanın ana temasını okurken güçlü tarafların ve gelişim alanların birlikte görünür. Bu yorum, potansiyellerini daha net fark etmen için yapılandırıldı."));
            out.put("coreSummary", normalizeParagraph(text(root, "coreSummary"),
                    "Büyük üçlü ve ana açılar bir araya geldiğinde karakterinde hem sezgisel hem stratejik çalışan bir denge dikkat çeker."));

            ArrayNode sections = normalizeNatalSections(root.path("sections"));
            if (sections.isEmpty()) {
                sections.add(createFallbackSection());
            }
            out.set("sections", sections);

            ArrayNode planetHighlights = normalizeNatalPlanetHighlights(root.path("planetHighlights"));
            out.set("planetHighlights", planetHighlights);

            out.put("closing", normalizeParagraph(text(root, "closing"),
                    "Bu harita bir kader hükmü değil, farkındalık haritasıdır. Güçlü taraflarını bilinçli kullandıkça zorlayıcı temaları da daha yaratıcı yönetebilirsin."));

            return objectMapper.writeValueAsString(out);
        } catch (Exception e) {
            logger.warn("Natal JSON normalization failed, returning fallback envelope: {}", e.getMessage());
            return buildFallbackNatalJson(response);
        }
    }

    private String buildFallbackNatalJson(String rawResponse) {
        try {
            String recoveredNarrative = recoverNarrativeFromRawResponse(rawResponse);
            List<String> recoveredParagraphs = splitNarrativeParagraphs(recoveredNarrative);

            ObjectNode out = objectMapper.createObjectNode();
            out.put("version", "natal_v2");
            out.put("tone", "scientific_warm");
            out.put("opening", normalizeParagraph(
                    recoveredParagraphs.size() > 0 ? recoveredParagraphs.get(0) : "",
                    "Harita yorumunda beklenmeyen bir format geldiği için içerik sade bir akışla gösteriliyor."));
            out.put("coreSummary", normalizeParagraph(
                    recoveredParagraphs.size() > 1 ? recoveredParagraphs.get(1) : "",
                    "Temel yorum korunarak başlıklara ayrıştırıldı; detaylar yeniden üretimde daha zenginleşir."));

            ArrayNode sections = objectMapper.createArrayNode();
            List<String> sectionSource = recoveredParagraphs.size() > 2
                    ? recoveredParagraphs.subList(2, recoveredParagraphs.size())
                    : recoveredParagraphs;
            int sectionIndex = 0;
            for (String paragraph : sectionSource) {
                if (sectionIndex >= 4) break;
                String cleaned = normalizeParagraph(paragraph, "");
                if (!nonBlank(cleaned) || cleaned.length() < 24) continue;
                sections.add(buildRecoveredSection(sectionIndex, cleaned));
                sectionIndex += 1;
            }
            if (sections.isEmpty()) {
                sections.add(createFallbackSection());
            }
            out.set("sections", sections);

            out.set("planetHighlights", objectMapper.createArrayNode());
            String closingFallback = "Yorum bu aşamada sadeleştirilmiş yapıda sunuldu. Yeniden denediğinde daha detaylı bölüm kartları üretilecektir.";
            String closing = recoveredParagraphs.size() > 2
                    ? recoveredParagraphs.get(recoveredParagraphs.size() - 1)
                    : closingFallback;
            out.put("closing", normalizeParagraph(closing, closingFallback));
            return objectMapper.writeValueAsString(out);
        } catch (Exception e) {
            return "{\"version\":\"natal_v2\",\"tone\":\"scientific_warm\",\"opening\":\"Yorum normalizasyonu başarısız oldu.\",\"coreSummary\":\"Ham çıktı korunamadı.\",\"sections\":[],\"planetHighlights\":[],\"closing\":\"Lütfen tekrar deneyin.\"}";
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

    private ObjectNode buildRecoveredSection(int index, String paragraph) {
        ObjectNode section = objectMapper.createObjectNode();
        section.put("id", "recovered_section_" + (index + 1));
        section.put("title", defaultRecoveredSectionTitle(index));
        section.put("body", truncate(paragraph, 420));
        section.put("dailyLifeExample", defaultRecoveredDailyExample(index));
        ArrayNode bullets = objectMapper.createArrayNode();
        bullets.add(bullet("Öne Çıkan Nokta", truncate(paragraph, 180)));
        section.set("bulletPoints", bullets);
        return section;
    }

    private String defaultRecoveredSectionTitle(int index) {
        return switch (index) {
            case 0 -> "Kozmik Ana Tema";
            case 1 -> "Duygusal ve Zihinsel Akış";
            case 2 -> "İlişkiler ve Günlük Yaşam";
            default -> "Gelişim Odağı";
        };
    }

    private String defaultRecoveredDailyExample(int index) {
        return switch (index) {
            case 0 -> "Günlük akışta bu tema, karar verirken hangi iç sesin öne çıktığını fark etmeni sağlar.";
            case 1 -> "İletişim ve duygu arasında denge kurduğunda daha net ve sakin ilerlersin.";
            case 2 -> "İlişkilerde küçük ama tutarlı adımlar bu temayı somut biçimde güçlendirir.";
            default -> "Bu başlık, bir sonraki adımı belirlerken önceliklerini sadeleştirmen için yol gösterir.";
        };
    }

    private ArrayNode normalizeNatalSections(JsonNode sectionsNode) {
        ArrayNode out = objectMapper.createArrayNode();
        if (sectionsNode == null || !sectionsNode.isArray()) return out;

        int index = 0;
        for (JsonNode node : sectionsNode) {
            if (out.size() >= 9) break;
            if (node == null || !node.isObject()) continue;
            ObjectNode section = objectMapper.createObjectNode();

            String rawId = nonBlank(text(node, "id")) ? text(node, "id") : text(node, "title");
            String rawTitle = text(node, "title");
            String body = normalizeParagraph(firstNonBlank(
                    text(node, "body"),
                    text(node, "text"),
                    text(node, "content"),
                    text(node, "description")), "Bu bölüm için yorum özeti hazırlanamadı.");
            String daily = normalizeParagraph(firstNonBlank(
                    text(node, "dailyLifeExample"),
                    text(node, "daily_life_example"),
                    text(node, "example")), "Günlük hayatta bu tema kararlarını ve ilişkilerini küçük ama etkili biçimde yönlendirebilir.");

            section.put("id", normalizeSnakeCase(rawId, "section_" + (index + 1)));
            section.put("title", normalizeUiTitle(rawTitle, "Bölüm " + (index + 1)));
            section.put("body", body);
            section.put("dailyLifeExample", daily);
            section.set("bulletPoints", normalizeBulletPoints(node.path("bulletPoints"), body, daily));

            out.add(section);
            index += 1;
        }
        return out;
    }

    private ArrayNode normalizeNatalPlanetHighlights(JsonNode planetNode) {
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

            String intro = normalizeParagraph(text(node, "intro"),
                    "Bu yerleşim karakterinin önemli bir temasını görünür kılar.");
            String character = normalizeParagraph(text(node, "character"),
                    "Burç ve ev yerleşimi bu gezegenin sende nasıl çalıştığını belirginleştirir.");
            String depth = normalizeParagraph(text(node, "depth"),
                    "Bu konum hem yetenek hem gelişim alanı barındırır; gölge tarafı fark etmek potansiyeli açar.");
            String daily = normalizeParagraph(firstNonBlank(text(node, "dailyLifeExample"), text(node, "daily_life_example")),
                    "Günlük kararlarında bu enerjiyi bilinçli kullandığında daha dengeli sonuç alırsın.");

            ObjectNode outNode = objectMapper.createObjectNode();
            outNode.put("planetId", planetId);
            outNode.put("title", normalizeUiTitle(text(node, "title"), defaultPlanetTitle(planetId)));
            outNode.put("intro", intro);
            outNode.put("character", character);
            outNode.put("depth", depth);
            outNode.put("dailyLifeExample", daily);
            outNode.set("analysisLines", normalizeAnalysisLines(node.path("analysisLines"), character, intro, depth, daily));
            out.add(outNode);
            count += 1;
        }
        return out;
    }

    private ArrayNode normalizeBulletPoints(JsonNode bulletNode, String body, String daily) {
        ArrayNode out = objectMapper.createArrayNode();
        if (bulletNode != null && bulletNode.isArray()) {
            for (JsonNode bp : bulletNode) {
                if (out.size() >= 5) break;
                if (bp == null || bp.isNull()) continue;
                ObjectNode item = objectMapper.createObjectNode();
                if (bp.isTextual()) {
                    item.put("title", "Ana Nokta");
                    item.put("detail", truncate(normalizeParagraph(bp.asText(), ""), 180));
                } else if (bp.isObject()) {
                    String title = normalizeUiTitle(firstNonBlank(text(bp, "title"), text(bp, "label"), text(bp, "name")), "Ana Nokta");
                    String detail = truncate(normalizeParagraph(firstNonBlank(text(bp, "detail"), text(bp, "text"), text(bp, "body")), ""), 200);
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
            out.add(bullet("Ana Tema", truncate(body, 180)));
            out.add(bullet("Günlük Hayata Yansıması", truncate(daily, 180)));
        }
        return out;
    }

    private ArrayNode normalizeAnalysisLines(JsonNode linesNode, String character, String intro, String depth, String daily) {
        ArrayNode out = objectMapper.createArrayNode();
        if (linesNode != null && linesNode.isArray()) {
            for (JsonNode line : linesNode) {
                if (out.size() >= 6) break;
                if (line == null || !line.isObject()) continue;
                String text = normalizeParagraph(firstNonBlank(text(line, "text"), text(line, "detail"), text(line, "body")), "");
                if (!nonBlank(text)) continue;
                ObjectNode item = objectMapper.createObjectNode();
                item.put("icon", normalizeLineIcon(text(line, "icon")));
                item.put("title", normalizeUiTitle(text(line, "title"), "Analiz"));
                item.put("text", truncate(text, 220));
                out.add(item);
            }
        }

        if (out.isEmpty()) {
            out.add(analysisLine("sparkles", "Karakter Analizi", truncate(character, 220)));
            out.add(analysisLine("rocket", "Seni Nasıl Etkiler?", truncate(firstNonBlank(intro, daily), 220)));
            out.add(analysisLine("warning", "Dikkat Etmen Gerekenler", truncate(depth, 220)));
            out.add(analysisLine("star", "Öne Çıkan Özellikler", truncate(daily, 220)));
        }

        return out;
    }

    private ObjectNode createFallbackSection() {
        ObjectNode section = objectMapper.createObjectNode();
        section.put("id", "core_portrait");
        section.put("title", "Kozmik Portrenin Özü");
        section.put("body", "Haritanın ana temaları sade bir akışla toparlandı ve okunabilir bölüm yapısına yerleştirildi.");
        section.put("dailyLifeExample", "Günlük hayatta bu tema, kararlarını alırken hangi iç güdünün öne çıktığını daha iyi fark etmene yardım eder.");
        ArrayNode bullets = objectMapper.createArrayNode();
        bullets.add(bullet("Yorum Akışı", "İçerik, başlık ve kısa açıklamalar halinde daha net okunacak biçime getirildi."));
        bullets.add(bullet("Sonraki Üretim", "Yeniden üretimde daha detaylı bölüm kartları ve gezegen satırları oluşacaktır."));
        section.set("bulletPoints", bullets);
        return section;
    }

    private ObjectNode bullet(String title, String detail) {
        ObjectNode n = objectMapper.createObjectNode();
        n.put("title", normalizeUiTitle(title, "Ana Nokta"));
        n.put("detail", normalizeParagraph(detail, ""));
        return n;
    }

    private ObjectNode analysisLine(String icon, String title, String text) {
        ObjectNode n = objectMapper.createObjectNode();
        n.put("icon", normalizeLineIcon(icon));
        n.put("title", normalizeUiTitle(title, "Analiz"));
        n.put("text", normalizeParagraph(text, ""));
        return n;
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
}
