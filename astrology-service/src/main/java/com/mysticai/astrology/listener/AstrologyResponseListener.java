package com.mysticai.astrology.listener;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.entity.DreamEntry;
import com.mysticai.astrology.entity.LuckyDatesResult;
import com.mysticai.astrology.entity.MonthlyDreamStory;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.entity.Synastry;
import com.mysticai.astrology.repository.DreamEntryRepository;
import com.mysticai.astrology.repository.LuckyDatesResultRepository;
import com.mysticai.astrology.repository.MonthlyDreamStoryRepository;
import com.mysticai.astrology.repository.NatalChartRepository;
import com.mysticai.astrology.repository.SynastryRepository;
import com.mysticai.common.event.AiAnalysisEvent;
import com.mysticai.common.event.AiAnalysisResponseEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Listener for AI analysis responses from the AI Orchestrator.
 * Handles both NATAL_CHART and LUCKY_DATES response types.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AstrologyResponseListener {

    private final NatalChartRepository natalChartRepository;
    private final LuckyDatesResultRepository luckyDatesResultRepository;
    private final DreamEntryRepository dreamEntryRepository;
    private final MonthlyDreamStoryRepository monthlyDreamStoryRepository;
    private final SynastryRepository synastryRepository;
    private final ObjectMapper objectMapper;

    private static final List<String> DREAM_NARRATIVE_KEYS = List.of(
            "interpretation", "yorum", "analysis", "message", "cosmicInterpretation", "dreamInterpretation",
            "main", "summary", "insight", "insights", "meaning", "body", "content", "description",
            "mainInterpretation", "main_interpretation", "psychological", "psychologicalReflection",
            "psychological_reflection", "astrological", "astrologicalInsight", "astrological_insight",
            "astrologicalInterpretation", "astrological_interpretation", "spiritualMessage", "spiritual_message",
            "subconsciousMessage", "subconscious_message", "shadowMessage", "shadow_message",
            "symbolAnalysis", "symbol_analysis", "symbolMeaning", "symbol_meaning", "advice"
    );

    private static final List<String> DREAM_OPPORTUNITY_KEYS = List.of(
            "opportunities", "opportunity", "firsatlar", "fırsatlar", "firsat", "fırsat",
            "actions", "guidance", "nextSteps", "next_steps", "recommendations", "suggestions",
            "actionPlan", "action_plan"
    );

    private static final List<String> DREAM_WARNING_KEYS = List.of(
            "warnings", "warning", "uyarilar", "uyarılar", "uyari", "uyarı", "cautions",
            "risks", "riskler", "attentionPoints", "attention_points", "avoid"
    );

    private static final List<String> DREAM_LIST_ITEM_TITLE_KEYS = List.of(
            "title", "label", "name", "heading", "symbol"
    );

    private static final List<String> DREAM_LIST_ITEM_BODY_KEYS = List.of(
            "text", "body", "content", "description", "detail", "details", "message",
            "meaning", "reason", "advice", "action", "guidance", "warning", "opportunity"
    );
    private static final Pattern CANNED_HARMONY_INSIGHT_PATTERN = Pattern.compile(
            "(?is).*bu\\s+iki\\s+haritan[ıi]n\\s+uyumu\\s*\\d+\\s*puan.*güçlü\\s+bir\\s+çekim\\s+yarat[ıi]yor.*"
    );
    private static final Pattern HARMONY_SCORE_PUAN_PATTERN =
            Pattern.compile("(?i)\\b(\\d{1,3})\\s*puan(?:lık)?\\b");
    private static final Pattern HARMONY_SCORE_FRACTION_PATTERN =
            Pattern.compile("(?i)\\b(\\d{1,3})\\s*/\\s*100\\b");
    private static final String[] DREAM_ENGLISH_REMAINDER_TOKENS = {
            "dearest", "favorite", "favourite", "vibe", "harmony", "healing",
            "frustration", "procrastination", "opportunity", "opportunities",
            "warning", "warnings", "journey", "dream", "shadow", "subconscious"
    };

    @RabbitListener(queues = "ai.responses.astrology.queue")
    public void handleAiResponse(AiAnalysisResponseEvent event) {
        log.info("Received AI response for correlationId: {}, type: {}", event.correlationId(), event.analysisType());

        if (event.analysisType() == AiAnalysisEvent.AnalysisType.NATAL_CHART) {
            handleNatalChartResponse(event);
        } else if (event.analysisType() == AiAnalysisEvent.AnalysisType.LUCKY_DATES) {
            handleLuckyDatesResponse(event);
        } else if (event.analysisType() == AiAnalysisEvent.AnalysisType.DREAM_SYNTHESIS) {
            handleDreamSynthesisResponse(event);
        } else if (event.analysisType() == AiAnalysisEvent.AnalysisType.MONTHLY_DREAM_STORY) {
            handleMonthlyDreamStoryResponse(event);
        } else if (event.analysisType() == AiAnalysisEvent.AnalysisType.RELATIONSHIP_ANALYSIS) {
            handleRelationshipAnalysisResponse(event);
        }
    }

    private void handleNatalChartResponse(AiAnalysisResponseEvent event) {
        try {
            String payload = event.originalPayload();
            NatalChartPayload chartPayload = objectMapper.readValue(payload, NatalChartPayload.class);

            NatalChart chart = natalChartRepository.findById(chartPayload.chartId())
                    .orElse(null);

            if (chart != null) {
                if (event.success()) {
                    chart.setAiInterpretation(event.interpretation());
                    chart.setInterpretationStatus("COMPLETED");
                    log.info("Updated natal chart {} with AI interpretation", chart.getId());
                } else {
                    chart.setInterpretationStatus("FAILED");
                    log.warn("AI interpretation failed for natal chart {}", chart.getId());
                }
                natalChartRepository.save(chart);
            } else {
                log.warn("Natal chart not found for id: {}", chartPayload.chartId());
            }
        } catch (Exception e) {
            log.error("Failed to process AI response for natal chart", e);
        }
    }

    private void handleLuckyDatesResponse(AiAnalysisResponseEvent event) {
        try {
            LuckyDatesResult result = luckyDatesResultRepository.findByCorrelationId(event.correlationId())
                    .orElse(null);

            if (result != null) {
                if (event.success()) {
                    result.setAiInterpretation(event.interpretation());
                    result.setInterpretationStatus("COMPLETED");
                    log.info("Updated lucky dates {} with AI interpretation", result.getId());
                } else {
                    result.setInterpretationStatus("FAILED");
                    log.warn("AI interpretation failed for lucky dates {}", result.getId());
                }
                luckyDatesResultRepository.save(result);
            } else {
                log.warn("Lucky dates result not found for correlationId: {}", event.correlationId());
            }
        } catch (Exception e) {
            log.error("Failed to process AI response for lucky dates", e);
        }
    }

    private void handleDreamSynthesisResponse(AiAnalysisResponseEvent event) {
        try {
            DreamEntry entry = dreamEntryRepository.findByCorrelationId(event.correlationId())
                    .orElse(null);

            if (entry == null) {
                log.warn("DreamEntry not found for correlationId: {}", event.correlationId());
                return;
            }

            if (!event.success()) {
                entry.setInterpretationStatus("FAILED");
                dreamEntryRepository.save(entry);
                log.warn("Dream synthesis failed for entry {}", entry.getId());
                return;
            }

            // Parse the JSON response: {"interpretation":"...","opportunities":[...],"warnings":[...]}
            String aiJson = event.interpretation();
            DreamSynthesisContent content = parseDreamSynthesisContent(aiJson);
            try {
                if (content.hasContent()) {
                    DreamSynthesisContent safeContent = makeDreamContentUserFriendly(content, entry);
                    entry.setInterpretation(safeContent.interpretation());
                    entry.setOpportunitiesJson(objectMapper.writeValueAsString(safeContent.opportunities()));
                    entry.setWarningsJson(objectMapper.writeValueAsString(safeContent.warnings()));
                } else {
                    throw new IllegalArgumentException("Dream synthesis payload was empty after normalization");
                }
            } catch (Exception parseEx) {
                // Preserve raw narrative if normalization fails so the journal never stays blank.
                log.warn("Dream synthesis response could not be normalized, storing raw text");
                String rawText = normalizeDreamText(aiJson);
                entry.setInterpretation(isUserFriendlyTurkishDreamText(rawText)
                        ? rawText
                        : buildFallbackDreamInterpretation(entry));
                entry.setOpportunitiesJson(objectMapper.writeValueAsString(buildFallbackDreamOpportunities(entry)));
                entry.setWarningsJson(objectMapper.writeValueAsString(buildFallbackDreamWarnings()));
            }

            entry.setInterpretationStatus("COMPLETED");
            dreamEntryRepository.save(entry);
            log.info("Updated DreamEntry {} with synthesis", entry.getId());
        } catch (Exception e) {
            log.error("Failed to process dream synthesis response", e);
        }
    }

    private DreamSynthesisContent parseDreamSynthesisContent(String rawResponse) {
        for (String candidate : buildDreamJsonParseCandidates(rawResponse)) {
            try {
                JsonNode parsed = objectMapper.readTree(candidate);
                DreamSynthesisContent content = extractDreamSynthesisContent(parsed);
                if (content.hasContent()) {
                    return content;
                }
            } catch (Exception ignored) {
                // Keep trying alternate candidates.
            }
        }
        return DreamSynthesisContent.empty();
    }

    private DreamSynthesisContent extractDreamSynthesisContent(JsonNode parsed) {
        if (parsed == null || parsed.isNull()) {
            return DreamSynthesisContent.empty();
        }

        if (parsed.isTextual()) {
            String text = normalizeDreamText(parsed.asText(""));
            return text.isBlank()
                    ? DreamSynthesisContent.empty()
                    : new DreamSynthesisContent(text, List.of(), List.of());
        }

        if (!parsed.isObject()) {
            return DreamSynthesisContent.empty();
        }

        String interpretation = collectDreamNarrative(parsed);
        List<String> opportunities = readFirstDreamList(parsed, DREAM_OPPORTUNITY_KEYS);
        List<String> warnings = readFirstDreamList(parsed, DREAM_WARNING_KEYS);

        return new DreamSynthesisContent(blankToNull(interpretation), opportunities, warnings);
    }

    private String readDreamText(JsonNode root, String key) {
        JsonNode node = root.path(key);
        if (node.isMissingNode() || node.isNull()) {
            return "";
        }
        return normalizeDreamNarrative(node);
    }

    private List<String> readFirstDreamList(JsonNode root, List<String> keys) {
        for (String key : keys) {
            List<String> values = readDreamList(root, key);
            if (!values.isEmpty()) {
                return values;
            }
        }
        return List.of();
    }

    private List<String> readDreamList(JsonNode root, String key) {
        JsonNode node = root.path(key);
        if (node.isMissingNode() || node.isNull()) {
            return List.of();
        }
        return normalizeDreamList(node);
    }

    private List<String> normalizeDreamList(JsonNode node) {
        List<String> values = new ArrayList<>();
        if (node == null || node.isNull() || node.isMissingNode()) {
            return values;
        }

        if (node.isArray()) {
            for (JsonNode child : node) {
                addDreamListNode(values, child);
            }
            return values;
        }

        if (node.isObject()) {
            addDreamListObjectValue(values, node);
            return values;
        }

        if (!node.isTextual()) {
            return values;
        }

        String rawText = stripMarkdown(node.asText(""))
                .replace("\\n", "\n")
                .trim();
        if (rawText.isBlank()) {
            return values;
        }

        JsonNode parsed = tryParseDreamJsonText(rawText);
        if (parsed != null) {
            if (parsed.isArray()) {
                parsed.forEach(child -> addDreamListNode(values, child));
                return values;
            }
            if (parsed.isObject()) {
                addDreamListObjectValue(values, parsed);
                return values;
            }
        }

        for (String part : rawText.split("\\r?\\n|\\s*[•;]\\s*")) {
            addDreamListValue(values, part);
        }
        return values;
    }

    private void addDreamListNode(List<String> target, JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return;
        }
        if (node.isObject()) {
            addDreamListObjectValue(target, node);
            return;
        }
        if (node.isArray()) {
            node.forEach(child -> addDreamListNode(target, child));
            return;
        }
        addDreamListValue(target, node.asText(""));
    }

    private void addDreamListObjectValue(List<String> target, JsonNode node) {
        String title = firstDreamObjectText(node, DREAM_LIST_ITEM_TITLE_KEYS);
        List<String> parts = new ArrayList<>();

        for (String key : DREAM_LIST_ITEM_BODY_KEYS) {
            addDreamParagraph(parts, readDreamText(node, key));
        }

        var fields = node.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            String key = field.getKey() == null ? "" : field.getKey();
            String lowerKey = key.toLowerCase(Locale.ROOT);
            if (DREAM_LIST_ITEM_TITLE_KEYS.contains(key)
                    || DREAM_LIST_ITEM_BODY_KEYS.contains(key)
                    || isDreamMetadataKey(lowerKey)
                    || isDreamListKey(lowerKey)) {
                continue;
            }
            addDreamParagraph(parts, normalizeDreamNarrative(field.getValue()));
        }

        String body = String.join(" ", parts).trim();
        if (!title.isBlank() && !body.isBlank() && !body.startsWith(title)) {
            addDreamListValue(target, title + ": " + body);
            return;
        }
        addDreamListValue(target, body.isBlank() ? title : body);
    }

    private String firstDreamObjectText(JsonNode node, List<String> keys) {
        for (String key : keys) {
            String value = readDreamText(node, key);
            if (!value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private void addDreamListValue(List<String> target, String rawValue) {
        String normalized = normalizeDreamText(rawValue)
                .replaceFirst("^[\\-•*\\d.)\\s]+", "")
                .trim();
        if (!normalized.isBlank() && !target.contains(normalized)) {
            target.add(normalized);
        }
    }

    private String collectDreamNarrative(JsonNode root) {
        return collectDreamNarrative(root, 0);
    }

    private String collectDreamNarrative(JsonNode root, int depth) {
        if (root == null || root.isNull() || root.isMissingNode() || depth > 5) {
            return "";
        }

        if (!root.isObject()) {
            return normalizeDreamNarrative(root, depth + 1);
        }

        List<String> parts = new ArrayList<>();
        for (String key : DREAM_NARRATIVE_KEYS) {
            addDreamParagraph(parts, readDreamText(root, key));
        }

        var fields = root.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            String key = field.getKey() == null ? "" : field.getKey();
            String lowerKey = key.toLowerCase(Locale.ROOT);
            if (DREAM_NARRATIVE_KEYS.contains(key) || isDreamListKey(lowerKey) || isDreamMetadataKey(lowerKey)) {
                continue;
            }
            addDreamParagraph(parts, normalizeDreamNarrative(field.getValue(), depth + 1));
        }
        return String.join("\n\n", parts).trim();
    }

    private String normalizeDreamNarrative(JsonNode node) {
        return normalizeDreamNarrative(node, 0);
    }

    private String normalizeDreamNarrative(JsonNode node, int depth) {
        if (node == null || node.isNull() || node.isMissingNode() || depth > 5) {
            return "";
        }
        if (node.isTextual()) {
            String text = normalizeDreamText(node.asText(""));
            JsonNode parsed = tryParseDreamJsonText(text);
            return parsed == null ? text : normalizeDreamNarrative(parsed, depth + 1);
        }
        if (node.isArray()) {
            List<String> parts = new ArrayList<>();
            node.forEach(child -> addDreamParagraph(parts, normalizeDreamNarrative(child, depth + 1)));
            return String.join("\n\n", parts).trim();
        }
        if (node.isObject()) {
            return collectDreamNarrative(node, depth + 1);
        }
        return "";
    }

    private void addDreamParagraph(List<String> target, String value) {
        String normalized = value == null ? "" : value.trim();
        if (!normalized.isBlank() && !target.contains(normalized)) {
            target.add(normalized);
        }
    }

    private JsonNode tryParseDreamJsonText(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            return null;
        }
        String trimmed = stripMarkdown(rawText).trim();
        if (!((trimmed.startsWith("{") && trimmed.endsWith("}"))
                || (trimmed.startsWith("[") && trimmed.endsWith("]")))) {
            return null;
        }
        try {
            return objectMapper.readTree(trimmed);
        } catch (Exception ignored) {
            try {
                return objectMapper.readTree(normalizeLooseJson(trimmed));
            } catch (Exception ignoredAgain) {
                return null;
            }
        }
    }

    private boolean isDreamListKey(String key) {
        return key.contains("warning")
                || key.contains("uyarı")
                || key.contains("uyari")
                || key.contains("risk")
                || key.contains("opportun")
                || key.contains("fırsat")
                || key.contains("firsat")
                || key.contains("action")
                || key.contains("guidance")
                || key.contains("caution")
                || key.contains("avoid");
    }

    private boolean isDreamMetadataKey(String key) {
        return key.equals("id")
                || key.equals("title")
                || key.equals("label")
                || key.equals("heading")
                || key.equals("status")
                || key.equals("locale")
                || key.equals("language")
                || key.equals("createdat")
                || key.equals("created_at")
                || key.equals("dreamdate")
                || key.equals("dream_date")
                || key.equals("correlationid")
                || key.equals("correlation_id")
                || key.endsWith("id")
                || key.endsWith("_id");
    }

    private List<String> buildDreamJsonParseCandidates(String response) {
        List<String> candidates = new ArrayList<>();
        String raw = response == null ? "" : response.trim();
        String markdownStripped = stripMarkdown(raw);
        String extracted = extractJsonObject(markdownStripped);
        String normalized = normalizeLooseJson(extracted.isBlank() ? markdownStripped : extracted);
        String unwrappedStringified = unwrapStringifiedJsonCandidate(markdownStripped);

        addParseCandidate(candidates, raw);
        addParseCandidate(candidates, markdownStripped);
        addParseCandidate(candidates, extracted);
        addParseCandidate(candidates, normalized);
        addParseCandidate(candidates, extractJsonObject(normalized));

        if (!unwrappedStringified.isBlank()) {
            String normalizedInner = normalizeLooseJson(unwrappedStringified);
            addParseCandidate(candidates, unwrappedStringified);
            addParseCandidate(candidates, extractJsonObject(unwrappedStringified));
            addParseCandidate(candidates, normalizedInner);
            addParseCandidate(candidates, extractJsonObject(normalizedInner));
        }

        return candidates;
    }

    private void addParseCandidate(List<String> target, String candidate) {
        if (candidate == null) {
            return;
        }
        String trimmed = candidate.trim();
        if (!trimmed.isEmpty() && !target.contains(trimmed)) {
            target.add(trimmed);
        }
    }

    private String stripMarkdown(String response) {
        if (response == null) {
            return "";
        }
        String normalized = response.trim();
        if (normalized.startsWith("```")) {
            int firstNewLine = normalized.indexOf('\n');
            normalized = firstNewLine >= 0
                    ? normalized.substring(firstNewLine + 1).trim()
                    : normalized.substring(3).trim();
        }
        if (normalized.endsWith("```")) {
            normalized = normalized.substring(0, normalized.lastIndexOf("```")).trim();
        }
        return normalized;
    }

    private String extractJsonObject(String response) {
        if (response == null || response.isBlank()) {
            return "";
        }
        int start = response.indexOf('{');
        int end = response.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return response.substring(start, end + 1).trim();
        }
        return response.trim();
    }

    private String normalizeLooseJson(String input) {
        if (input == null || input.isBlank()) {
            return "";
        }
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
        if (input == null || input.isBlank()) {
            return "";
        }
        String trimmed = input.trim();
        if (!(trimmed.startsWith("\"") && trimmed.endsWith("\""))) {
            return "";
        }
        try {
            JsonNode parsed = objectMapper.readTree(trimmed);
            return parsed != null && parsed.isTextual() ? parsed.asText("").trim() : "";
        } catch (Exception ignored) {
            return "";
        }
    }

    private String normalizeDreamText(String raw) {
        if (raw == null) {
            return "";
        }
        return replaceDreamLanguageArtifacts(stripMarkdown(raw)
                .replace("\\n", "\n")
                .replaceAll("[\\t\\x0B\\f\\r]+", " ")
                .replaceAll("[ ]*\\n+[ ]*", "\n\n")
                .replaceAll(" {2,}", " ")
                .trim());
    }

    private DreamSynthesisContent makeDreamContentUserFriendly(DreamSynthesisContent content, DreamEntry entry) {
        String interpretation = repairDreamNarrativeOrFallback(content.interpretation(), entry);

        List<String> opportunities = normalizeDreamActionList(
                content.opportunities(),
                buildFallbackDreamOpportunities(entry),
                2
        );
        List<String> warnings = normalizeDreamActionList(
                content.warnings(),
                buildFallbackDreamWarnings(),
                2
        );

        return new DreamSynthesisContent(interpretation, opportunities, warnings);
    }

    private String repairDreamNarrativeOrFallback(String raw, DreamEntry entry) {
        String normalized = normalizeDreamText(raw);
        if (isUserFriendlyTurkishDreamText(normalized)) {
            return normalized;
        }

        List<String> repaired = new ArrayList<>();
        for (String segment : normalized.split("(?<=[.!?])\\s+")) {
            String cleaned = normalizeDreamText(segment);
            if (isUserFriendlyTurkishDreamText(cleaned)) {
                repaired.add(cleaned);
            } else if (!cleaned.isBlank()) {
                repaired.add(buildFallbackDreamSentence(entry));
            }
        }

        String joined = String.join(" ", repaired).replaceAll(" {2,}", " ").trim();
        return joined.isBlank() ? buildFallbackDreamInterpretation(entry) : joined;
    }

    private List<String> normalizeDreamActionList(List<String> rawValues, List<String> fallback, int targetSize) {
        List<String> output = new ArrayList<>();
        if (rawValues != null) {
            for (String rawValue : rawValues) {
                if (output.size() >= targetSize) {
                    break;
                }
                String normalized = normalizeDreamText(rawValue);
                if (isUserFriendlyTurkishDreamText(normalized) && !output.contains(normalized)) {
                    output.add(normalized);
                }
            }
        }
        if (!output.isEmpty()) {
            return output;
        }

        int idx = 0;
        while (output.size() < targetSize && idx < fallback.size()) {
            String fallbackValue = fallback.get(idx++);
            if (!output.contains(fallbackValue)) {
                output.add(fallbackValue);
            }
        }
        return output;
    }

    private boolean isUserFriendlyTurkishDreamText(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.contains("###") || lower.contains("```")) {
            return false;
        }
        if (looksEnglishDominant(text)) {
            return false;
        }
        if (containsDreamEnglishRemainderToken(text)) {
            return false;
        }
        return !containsSevereDreamTranslationArtifact(text);
    }

    private boolean containsDreamEnglishRemainderToken(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        for (String token : DREAM_ENGLISH_REMAINDER_TOKENS) {
            if (text.matches("(?iu).*\\b" + Pattern.quote(token) + "\\p{L}*\\b.*")) {
                return true;
            }
        }
        return false;
    }

    private boolean containsSevereDreamTranslationArtifact(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        return text.matches("(?iu).*\\b(favorit|deyar|allarl|kızımlağ|kizimlag)\\p{L}*\\b.*");
    }

    private String replaceDreamLanguageArtifacts(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        String text = raw;
        text = text.replaceAll("(?m)^#{1,6}\\s*", "");
        text = text.replaceAll("(?iu)\\baries\\b", "Koç");
        text = text.replaceAll("(?iu)\\btaurus\\b", "Boğa");
        text = text.replaceAll("(?iu)\\bgemini\\b", "İkizler");
        text = text.replaceAll("(?iu)\\bcancer\\b", "Yengeç");
        text = text.replaceAll("(?iu)\\bleo\\b", "Aslan");
        text = text.replaceAll("(?iu)\\bvirgo\\b", "Başak");
        text = text.replaceAll("(?iu)\\blibra\\b", "Terazi");
        text = text.replaceAll("(?iu)\\bscorpio\\b", "Akrep");
        text = text.replaceAll("(?iu)\\bsagittarius\\b", "Yay");
        text = text.replaceAll("(?iu)\\bcapricorn\\b", "Oğlak");
        text = text.replaceAll("(?iu)\\baquarius\\b", "Kova");
        text = text.replaceAll("(?iu)\\bpisces\\b", "Balık");
        text = text.replaceAll("(?iu)\\bmoon\\b", "Ay");
        text = text.replaceAll("(?iu)\\bsun\\b", "Güneş");
        text = text.replaceAll("(?iu)\\bmercury\\b", "Merkür");
        text = text.replaceAll("(?iu)\\bvenus\\b", "Venüs");
        text = text.replaceAll("(?iu)\\bjupiter\\b", "Jüpiter");
        text = text.replaceAll("(?iu)\\bsaturn\\b", "Satürn");
        text = text.replaceAll("(?iu)\\buranus\\b", "Uranüs");
        text = text.replaceAll("(?iu)\\bneptune\\b", "Neptün");
        text = text.replaceAll("(?iu)\\bpluto\\b", "Plüton");
        text = text.replaceAll("(?iu)\\bchiron\\b", "Kiron");
        text = text.replaceAll("(?iu)\\bdearest\\b", "Sevgili");
        text = text.replaceAll("(?iu)\\bfavou?rite\\b", "sevgili");
        text = text.replaceAll("(?iu)\\bfavorit\\b", "sevgili");
        text = text.replaceAll("(?iu)\\bdeyar\\b", "sevgili");
        text = text.replaceAll("(?iu)\\ballarl\\p{L}*\\b", "rahatlayacaksın");
        text = text.replaceAll("(?iu)\\bkızımlağ\\p{L}*\\b", "gerilimin");
        text = text.replaceAll("(?iu)\\bkizimlag\\p{L}*\\b", "gerilimin");
        text = text.replaceAll("(?iu)\\bvibe\\b", "hava");
        text = text.replaceAll("(?iu)\\bharmony\\b", "uyum");
        text = text.replaceAll("(?iu)\\bhealing\\b", "iyileşme");
        text = text.replaceAll("(?iu)\\bfrustration\\p{L}*\\b", "gerilim");
        text = text.replaceAll("(?iu)\\bprocrastination\\b", "erteleme");
        text = text.replaceAll("(?iu)\\bprokrastinasyon\\b", "erteleme");
        text = text.replaceAll("(?iu)\\bdream\\b", "rüya");
        text = text.replaceAll("(?iu)\\bjourney\\b", "yolculuk");
        text = text.replaceAll("(?iu)\\bshadow\\b", "gölge");
        text = text.replaceAll("(?iu)\\bsubconscious\\b", "bilinçaltı");
        text = text.replaceAll("(?iu)\\bopportunities\\b", "fırsatlar");
        text = text.replaceAll("(?iu)\\bopportunity\\b", "fırsat");
        text = text.replaceAll("(?iu)\\bwarnings\\b", "uyarılar");
        text = text.replaceAll("(?iu)\\bwarning\\b", "uyarı");
        text = text.replaceAll("(?iu)\\bsevgili\\s+seni\\s+sevgili\\s+([\\p{L}ÇĞİÖŞÜçğıöşü]+)\\b", "Sevgili $1");
        text = text.replaceAll("(?iu)\\bsevgili\\s+seni\\s+ve\\s+sevgili\\s+([\\p{L}ÇĞİÖŞÜçğıöşü]+)\\b", "Sevgili $1");
        text = text.replaceAll("(?iu)\\bsevgili\\s+([\\p{L}ÇĞİÖŞÜçğıöşü]+),\\s*sevgili\\s+\\1\\b", "Sevgili $1");
        text = text.replaceAll(" {2,}", " ");
        return text.trim();
    }

    private String buildFallbackDreamSentence(DreamEntry entry) {
        return describeDreamSymbols(entry)
                + " teması burada, duygunu daha sakin okumaya ve küçük bir adımla kendini toparlamaya çağırıyor.";
    }

    private String buildFallbackDreamInterpretation(DreamEntry entry) {
        String symbols = describeDreamSymbols(entry);
        return "Bu rüya, zihninin gece boyunca işlemeye çalıştığı duygu ve ihtiyaçları görünür kılıyor. "
                + symbols + " öne çıktığı için yorumun merkezinde güven, yön bulma ve içsel rahatlama ihtiyacı var. "
                + "Bunu kesin bir işaret gibi değil, kendini daha iyi anlamana yardım eden sakin bir iç mesaj gibi okuyabilirsin. "
                + "Bugün rüyadan kalan duyguyu not etmek ve seni yoran konuyu küçük bir adımla sadeleştirmek iyi gelebilir.";
    }

    private List<String> buildFallbackDreamOpportunities(DreamEntry entry) {
        String symbols = describeDreamSymbols(entry);
        return List.of(
                "Bugün rüyadan aklında kalan en güçlü sembolü not al ve bu sembolün sende hangi duyguyu uyandırdığını tek cümleyle yaz.",
                symbols + " teması üzerinden, gün içinde seni rahatlatacak küçük ve uygulanabilir bir adım seç."
        );
    }

    private List<String> buildFallbackDreamWarnings() {
        return List.of(
                "Bu rüyayı tek başına kesin bir karar ya da kehanet gibi yorumlama; önce duygunun ne söylediğini anlamaya çalış.",
                "Yoğun bir his yükselirse hemen tepki vermek yerine kısa bir mola ver ve konuyu daha sakin bir anda ele al."
        );
    }

    private String describeDreamSymbols(DreamEntry entry) {
        List<String> recurring = readDreamStringList(entry != null ? entry.getRecurringSymbolsJson() : null);
        List<String> extracted = readDreamStringList(entry != null ? entry.getExtractedSymbolsJson() : null);
        List<String> symbols = !recurring.isEmpty() ? recurring : extracted;
        if (symbols.isEmpty()) {
            return "Rüyadaki ana imgeler";
        }

        List<String> cleaned = new ArrayList<>();
        for (String symbol : symbols) {
            String value = normalizeDreamText(symbol);
            if (!value.isBlank() && !cleaned.contains(value)) {
                cleaned.add(value);
            }
            if (cleaned.size() >= 3) {
                break;
            }
        }
        if (cleaned.isEmpty()) {
            return "Rüyadaki ana imgeler";
        }
        return String.join(", ", cleaned);
    }

    private List<String> readDreamStringList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private void handleMonthlyDreamStoryResponse(AiAnalysisResponseEvent event) {
        try {
            MonthlyDreamStory story = monthlyDreamStoryRepository
                    .findByCorrelationId(event.correlationId()).orElse(null);

            if (story == null) {
                log.warn("MonthlyDreamStory not found for correlationId: {}", event.correlationId());
                return;
            }

            if (!event.success()) {
                story.setStatus("FAILED");
                monthlyDreamStoryRepository.save(story);
                return;
            }

            story.setStory(event.interpretation());
            story.setStatus("COMPLETED");
            monthlyDreamStoryRepository.save(story);
            log.info("Updated MonthlyDreamStory {} with story for period {}", story.getId(), story.getYearMonth());
        } catch (Exception e) {
            log.error("Failed to process monthly dream story response", e);
        }
    }

    private void handleRelationshipAnalysisResponse(AiAnalysisResponseEvent event) {
        try {
            Synastry synastry = synastryRepository.findByCorrelationId(event.correlationId())
                    .orElse(null);

            if (synastry == null) {
                log.warn("Synastry not found for correlationId: {}", event.correlationId());
                return;
            }

            if (!event.success()) {
                synastry.setStatus("FAILED");
                synastryRepository.save(synastry);
                return;
            }

            // Parse the AI JSON response
            // {"harmonyScore":72,"harmonyInsight":"...","strengths":[...],"challenges":[...],"keyWarning":"...","cosmicAdvice":"..."}
            String aiJson = event.interpretation();
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> parsed = objectMapper.readValue(aiJson, Map.class);

                String fallbackInsight = buildFallbackHarmonyInsight(synastry);
                synastry.setHarmonyInsight(normalizeHarmonyInsight(
                        (String) parsed.get("harmonyInsight"),
                        fallbackInsight,
                        synastry.getHarmonyScore() == null ? 50 : synastry.getHarmonyScore()
                ));

                List<String> strengths = normalizeTextList(
                        parsed.get("strengths"),
                        3,
                        buildFallbackStrengths(synastry)
                );
                synastry.setStrengthsJson(objectMapper.writeValueAsString(strengths));

                List<String> challenges = normalizeTextList(
                        parsed.get("challenges"),
                        2,
                        buildFallbackChallenges(synastry)
                );
                synastry.setChallengesJson(objectMapper.writeValueAsString(challenges));

                String fallbackWarning = "En kritik risk, niyeti konuşmadan varsayım üzerinden tepki vermek olabilir.";
                synastry.setKeyWarning(ensureTurkishText((String) parsed.get("keyWarning"), fallbackWarning));

                String fallbackAdvice = buildFallbackAdvice(synastry);
                synastry.setCosmicAdvice(ensureTurkishText((String) parsed.get("cosmicAdvice"), fallbackAdvice));
            } catch (Exception parseEx) {
                log.warn("Relationship analysis response was not valid JSON, using Turkish fallback payload");
                synastry.setHarmonyInsight(buildFallbackHarmonyInsight(synastry));
                synastry.setStrengthsJson(objectMapper.writeValueAsString(buildFallbackStrengths(synastry)));
                synastry.setChallengesJson(objectMapper.writeValueAsString(buildFallbackChallenges(synastry)));
                synastry.setKeyWarning("En kritik risk, niyeti konuşmadan varsayım üzerinden tepki vermek olabilir.");
                synastry.setCosmicAdvice(buildFallbackAdvice(synastry));
            }

            synastry.setStatus("COMPLETED");
            synastryRepository.save(synastry);
            log.info("Updated Synastry {} with AI relationship analysis", synastry.getId());
        } catch (Exception e) {
            log.error("Failed to process relationship analysis response", e);
        }
    }

    private List<String> normalizeTextList(Object raw, int size, List<String> fallback) {
        List<String> output = new ArrayList<>();
        if (raw instanceof List<?> list) {
            for (Object item : list) {
                if (output.size() >= size) break;
                String fallbackItem = fallbackForIndex(fallback, output.size(), "Bu başlıkta küçük ama düzenli adımlar dengeyi destekler.");
                String normalized = ensureTurkishText(item == null ? null : item.toString(), fallbackItem);
                if (normalized != null && !normalized.isBlank()) {
                    output.add(normalized);
                }
            }
        }
        while (output.size() < size) {
            output.add(fallbackForIndex(fallback, output.size(), "Bu başlıkta küçük ama düzenli adımlar dengeyi destekler."));
        }
        return output;
    }

    private String fallbackForIndex(List<String> values, int index, String defaultValue) {
        if (values == null || index < 0 || index >= values.size()) return defaultValue;
        String value = values.get(index);
        return (value == null || value.isBlank()) ? defaultValue : value;
    }

    private String ensureTurkishText(String value, String fallback) {
        String normalized = replaceCommonEnglishTerms(value == null ? "" : value).trim();
        if (normalized.isBlank()) return fallback;
        if (looksEnglishDominant(normalized)) return fallback;
        return normalized;
    }

    private String normalizeHarmonyInsight(String value, String fallback, int resolvedHarmonyScore) {
        String normalized = ensureTurkishText(value, fallback);
        if (normalized == null || normalized.isBlank()) {
            return fallback;
        }
        if (CANNED_HARMONY_INSIGHT_PATTERN.matcher(normalized).matches()) {
            log.warn("Detected canned harmonyInsight template text; using fallback. score={}", resolvedHarmonyScore);
            return fallback;
        }
        if (containsConflictingHarmonyScoreReference(normalized, resolvedHarmonyScore)) {
            log.warn("Detected harmonyInsight score mismatch; using fallback. score={}", resolvedHarmonyScore);
            return fallback;
        }
        return normalized;
    }

    private boolean containsConflictingHarmonyScoreReference(String text, int expectedScore) {
        return extractReferencedHarmonyScore(text)
                .map(score -> score != expectedScore)
                .orElse(false);
    }

    private Optional<Integer> extractReferencedHarmonyScore(String text) {
        if (text == null || text.isBlank()) {
            return Optional.empty();
        }

        Matcher puanMatcher = HARMONY_SCORE_PUAN_PATTERN.matcher(text);
        while (puanMatcher.find()) {
            int parsed = safeParseReferencedScore(puanMatcher.group(1));
            if (parsed >= 0) {
                return Optional.of(parsed);
            }
        }

        Matcher fractionMatcher = HARMONY_SCORE_FRACTION_PATTERN.matcher(text);
        while (fractionMatcher.find()) {
            int parsed = safeParseReferencedScore(fractionMatcher.group(1));
            if (parsed >= 0) {
                return Optional.of(parsed);
            }
        }

        return Optional.empty();
    }

    private int safeParseReferencedScore(String value) {
        try {
            int parsed = Integer.parseInt(value);
            return parsed >= 0 && parsed <= 100 ? parsed : -1;
        } catch (NumberFormatException ignored) {
            return -1;
        }
    }

    private String replaceCommonEnglishTerms(String text) {
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
                .replace("warning", "uyarı")
                .replace("Warning", "Uyarı")
                .replace("advice", "öneri")
                .replace("Advice", "Öneri")
                .replace("support", "destek")
                .replace("Support", "Destek")
                .replace("balance", "denge")
                .replace("Balance", "Denge");
    }

    private boolean looksEnglishDominant(String text) {
        if (text == null || text.isBlank()) return true;
        String padded = " " + text.toLowerCase(Locale.ROOT) + " ";
        String[] markers = {
                " the ", " and ", " with ", " this ", " that ", " your ",
                " you ", " between ", " can ", " should ", " might ", " because "
        };
        int hits = 0;
        for (String marker : markers) {
            if (padded.contains(marker)) hits++;
        }
        boolean hasTurkishChars = padded.matches(".*[çğıöşü].*");
        return hits >= 3 && !hasTurkishChars;
    }

    private List<String> buildFallbackStrengths(Synastry synastry) {
        String a = safeName(synastry.getPersonAType(), true);
        String b = safeName(synastry.getPersonBType(), false);
        return List.of(
                a + " ile " + b + " arasında destekleyici başlıklarda doğal bir tamamlayıcılık oluşabilir.",
                "Açık ve net iletişim tercih edildiğinde yanlış anlaşılma olasılığı belirgin biçimde azalır.",
                "Ortak hedeflerin küçük adımlara bölünmesi ilişkinin güven hissini güçlendirebilir."
        );
    }

    private List<String> buildFallbackChallenges(Synastry synastry) {
        return List.of(
                "Duygusal tempo farkı zaman zaman problem yaratabilir; konuşma için doğru anı seçmek rahatlatır.",
                "Karar ritmi farklıysa biri hızlanırken diğeri geri çekilebilir; kısa bir duraklama denge sağlar."
        );
    }

    private String buildFallbackHarmonyInsight(Synastry synastry) {
        int score = synastry.getHarmonyScore() == null ? 50 : Math.max(0, Math.min(100, synastry.getHarmonyScore()));
        String relation = relationLabel(synastry.getRelationshipType());
        String a = safeName(synastry.getPersonAType(), true);
        String b = safeName(synastry.getPersonBType(), false);
        String level = score >= 80 ? "yüksek" : score >= 60 ? "orta-yüksek" : score >= 40 ? "dalgalı" : "zorlayıcı";
        return "%s ve %s arasında %s odağında %d puanlık, %s bir uyum görülüyor. "
                .formatted(a, b, relation, score, level)
                + "Güçlü alanlarda akış doğal olabilir; zorlayıcı alanlarda tempo farkını konuşmak belirleyici olur. "
                + "Düzenli ve kısa check-in konuşmaları bu bağı daha dengeli hale getirebilir.";
    }

    private String buildFallbackAdvice(Synastry synastry) {
        String relation = relationLabel(synastry.getRelationshipType());
        return "Bu %s dinamiğinde önce niyeti sonra çözümü konuşmak iyi sonuç verir. ".formatted(relation)
                + "Haftalık kısa bir iletişim ritmi belirleyin ve aynı anda tek bir konuya odaklanın. "
                + "Gerilim anında hız kesip duyguyu isimlendirmek, yanlış anlaşılma döngüsünü önemli ölçüde azaltır.";
    }

    private String safeName(String partyType, boolean personA) {
        if ("USER".equalsIgnoreCase(partyType)) {
            return personA ? "Sen" : "Karşı taraf";
        }
        return personA ? "Kişi A" : "Kişi B";
    }

    private String relationLabel(String relationshipType) {
        if (relationshipType == null || relationshipType.isBlank()) return "ilişki";
        return switch (relationshipType.toUpperCase(Locale.ROOT)) {
            case "LOVE" -> "aşk";
            case "BUSINESS" -> "iş ortaklığı";
            case "FRIENDSHIP" -> "arkadaşlık";
            case "FAMILY" -> "aile bağı";
            case "RIVAL" -> "rekabet";
            default -> "ilişki";
        };
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record NatalChartPayload(Long chartId) {}

    private record DreamSynthesisContent(
            String interpretation,
            List<String> opportunities,
            List<String> warnings
    ) {
        private static DreamSynthesisContent empty() {
            return new DreamSynthesisContent(null, List.of(), List.of());
        }

        private boolean hasContent() {
            return (interpretation != null && !interpretation.isBlank())
                    || (opportunities != null && !opportunities.isEmpty())
                    || (warnings != null && !warnings.isEmpty());
        }
    }
}
