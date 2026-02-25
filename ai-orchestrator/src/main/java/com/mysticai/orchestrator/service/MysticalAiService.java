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

            if (event.analysisType() == AiAnalysisEvent.AnalysisType.NATAL_CHART) {
                response = normalizeNatalChartJson(response);
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
                    extractFromPayload(event.payload(), "partnerGender"));
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
     * Backend-side validator/normalizer for the structured natal JSON schema.
     * Ensures the mobile app receives a stable shape even if the model returns
     * partial, malformed, or legacy-like data.
     */
    private String normalizeNatalChartJson(String response) {
        try {
            JsonNode parsed = objectMapper.readTree(response);
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
            ObjectNode out = objectMapper.createObjectNode();
            out.put("version", "natal_v2");
            out.put("tone", "scientific_warm");
            out.put("opening", "Harita yorumu teknik olarak düzeltildi ve güvenli formata alındı.");
            out.put("coreSummary", "AI çıktısı beklenen JSON şemasına uymadığı için normalize edilmiş bir yapı üretildi.");

            ArrayNode sections = objectMapper.createArrayNode();
            ObjectNode section = objectMapper.createObjectNode();
            section.put("id", "normalized_recovery");
            section.put("title", "Yorum Dönüştürme Notu");
            section.put("body", "Yorum metni otomatik olarak normalize edildi. Aşağıdaki içerik ham yanıttan kurtarılan özet metindir.");
            section.put("dailyLifeExample", "Yorumu tekrar oluşturduğunda başlıklar ve maddeler daha zengin gelecektir.");
            ArrayNode bullets = objectMapper.createArrayNode();
            ObjectNode bp = objectMapper.createObjectNode();
            bp.put("title", "Ham İçerik Özeti");
            bp.put("detail", truncate(normalizeParagraph(rawResponse, "İçerik alınamadı."), 240));
            bullets.add(bp);
            section.set("bulletPoints", bullets);
            sections.add(section);
            out.set("sections", sections);

            out.set("planetHighlights", objectMapper.createArrayNode());
            out.put("closing", "İçerik yapısı düzeltildi; yorumun yeniden üretimi ile daha detaylı bölüm kartları oluşacaktır.");
            return objectMapper.writeValueAsString(out);
        } catch (Exception e) {
            return "{\"version\":\"natal_v2\",\"tone\":\"scientific_warm\",\"opening\":\"Yorum normalizasyonu başarısız oldu.\",\"coreSummary\":\"Ham çıktı korunamadı.\",\"sections\":[],\"planetHighlights\":[],\"closing\":\"Lütfen tekrar deneyin.\"}";
        }
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
        section.put("body", "Haritanın ana temaları normalize edilerek güvenli görüntüleme formatına taşındı.");
        section.put("dailyLifeExample", "Günlük hayatta bu tema, kararlarını alırken hangi iç güdünün öne çıktığını daha iyi fark etmene yardım eder.");
        ArrayNode bullets = objectMapper.createArrayNode();
        bullets.add(bullet("Yapısal Not", "AI çıktısı eksik alanlar içerdiği için backend tarafından tamamlandı."));
        bullets.add(bullet("Görüntüleme", "Mobil ekranın başlık/büllet düzeni korunarak yorum gösterilecek."));
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

        // Common English narrative remnants
        s = s.replaceAll("(?iu)\\bhimself\\b", "kendini");
        s = s.replaceAll("(?iu)\\bherself\\b", "kendini");
        s = s.replaceAll("(?iu)\\bthemselves\\b", "kendilerini");
        s = s.replaceAll("(?iu)\\bsometimes\\b", "bazen");
        s = s.replaceAll("(?iu)\\boften\\b", "sık sık");
        s = s.replaceAll("(?iu)\\brarely\\b", "nadiren");
        s = s.replaceAll("(?iu)\\busually\\b", "genelde");
        s = s.replaceAll("(?iu)\\bhowever\\b", "ancak");
        s = s.replaceAll("(?iu)\\balso\\b", "ayrıca");
        s = s.replaceAll("(?iu)\\bsocially\\b", "sosyal olarak");
        s = s.replaceAll("(?iu)\\bemotionally\\b", "duygusal olarak");

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
                .replace("Jupiter",     "Jüpiter")
                .replace("Saturn",      "Satürn")
                .replace("Uranus",      "Uranüs")
                .replace("Neptune",     "Neptün")
                .replace("Pluto",       "Plüton")
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
