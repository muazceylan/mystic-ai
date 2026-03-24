package com.mysticai.astrology.listener;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
    private static final Pattern CANNED_HARMONY_INSIGHT_PATTERN = Pattern.compile(
            "(?is).*bu\\s+iki\\s+haritan[ıi]n\\s+uyumu\\s*\\d+\\s*puan.*güçlü\\s+bir\\s+çekim\\s+yarat[ıi]yor.*"
    );

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
                    entry.setInterpretation(content.interpretation());
                    entry.setOpportunitiesJson(objectMapper.writeValueAsString(content.opportunities()));
                    entry.setWarningsJson(objectMapper.writeValueAsString(content.warnings()));
                } else {
                    throw new IllegalArgumentException("Dream synthesis payload was empty after normalization");
                }
            } catch (Exception parseEx) {
                // Preserve raw narrative if normalization fails so the journal never stays blank.
                log.warn("Dream synthesis response could not be normalized, storing raw text");
                entry.setInterpretation(stripMarkdown(aiJson));
                entry.setOpportunitiesJson("[]");
                entry.setWarningsJson("[]");
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

        String interpretation = firstNonBlank(
                readDreamText(parsed, "interpretation"),
                readDreamText(parsed, "yorum"),
                readDreamText(parsed, "analysis"),
                readDreamText(parsed, "message"),
                readDreamText(parsed, "cosmicInterpretation"),
                readDreamText(parsed, "dreamInterpretation"),
                findLongestDreamNarrative(parsed)
        );

        List<String> opportunities = firstNonEmptyList(
                readDreamList(parsed, "opportunities"),
                readDreamList(parsed, "firsatlar"),
                readDreamList(parsed, "fırsatlar"),
                readDreamList(parsed, "actions"),
                readDreamList(parsed, "guidance")
        );

        List<String> warnings = firstNonEmptyList(
                readDreamList(parsed, "warnings"),
                readDreamList(parsed, "uyarilar"),
                readDreamList(parsed, "uyarılar"),
                readDreamList(parsed, "cautions")
        );

        return new DreamSynthesisContent(blankToNull(interpretation), opportunities, warnings);
    }

    @SafeVarargs
    private final List<String> firstNonEmptyList(List<String>... candidates) {
        for (List<String> candidate : candidates) {
            if (candidate != null && !candidate.isEmpty()) {
                return candidate;
            }
        }
        return List.of();
    }

    private String readDreamText(JsonNode root, String key) {
        JsonNode node = root.path(key);
        if (node.isMissingNode() || node.isNull()) {
            return "";
        }
        return normalizeDreamText(node.asText(""));
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
        if (node == null || node.isNull()) {
            return values;
        }

        if (node.isArray()) {
            for (JsonNode child : node) {
                addDreamListValue(values, child == null ? "" : child.asText(""));
            }
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

        if (rawText.startsWith("[") && rawText.endsWith("]")) {
            try {
                JsonNode parsed = objectMapper.readTree(rawText);
                if (parsed.isArray()) {
                    for (JsonNode child : parsed) {
                        addDreamListValue(values, child == null ? "" : child.asText(""));
                    }
                    return values;
                }
            } catch (Exception ignored) {
                // Fall through to plain-text splitting.
            }
        }

        for (String part : rawText.split("\\r?\\n|\\s*[•;]\\s*")) {
            addDreamListValue(values, part);
        }
        return values;
    }

    private void addDreamListValue(List<String> target, String rawValue) {
        String normalized = normalizeDreamText(rawValue)
                .replaceFirst("^[\\-•*\\d.)\\s]+", "")
                .trim();
        if (!normalized.isBlank() && !target.contains(normalized)) {
            target.add(normalized);
        }
    }

    private String findLongestDreamNarrative(JsonNode root) {
        String best = "";
        if (root == null || !root.isObject()) {
            return best;
        }

        var fields = root.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            String key = field.getKey() == null ? "" : field.getKey().toLowerCase(Locale.ROOT);
            if (isDreamListKey(key)) {
                continue;
            }
            JsonNode value = field.getValue();
            if (value != null && value.isTextual()) {
                String candidate = normalizeDreamText(value.asText(""));
                if (candidate.length() > best.length()) {
                    best = candidate;
                }
            }
        }
        return best;
    }

    private boolean isDreamListKey(String key) {
        return key.contains("warning")
                || key.contains("uyarı")
                || key.contains("uyari")
                || key.contains("opportun")
                || key.contains("fırsat")
                || key.contains("firsat")
                || key.contains("action")
                || key.contains("guidance")
                || key.contains("caution");
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
        return stripMarkdown(raw)
                .replace("\\n", "\n")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private String firstNonBlank(String... candidates) {
        for (String candidate : candidates) {
            if (candidate != null && !candidate.isBlank()) {
                return candidate.trim();
            }
        }
        return "";
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

                int baseScore = synastry.getHarmonyScore() == null
                        ? 50
                        : Math.max(0, Math.min(100, synastry.getHarmonyScore()));
                int resolvedHarmonyScore = resolveHarmonyScore(parsed.get("harmonyScore"), baseScore);
                synastry.setHarmonyScore(resolvedHarmonyScore);

                String fallbackInsight = buildFallbackHarmonyInsight(synastry);
                synastry.setHarmonyInsight(normalizeHarmonyInsight(
                        (String) parsed.get("harmonyInsight"),
                        fallbackInsight,
                        resolvedHarmonyScore
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

    private int resolveHarmonyScore(Object scoreObj, int baseScore) {
        int base = Math.max(0, Math.min(100, baseScore));
        int aiScore = parseIntScore(scoreObj, base);
        int min = Math.max(0, base - 8);
        int max = Math.min(100, base + 8);
        return Math.max(min, Math.min(max, aiScore));
    }

    private int parseIntScore(Object scoreObj, int fallback) {
        if (scoreObj == null) return fallback;
        try {
            if (scoreObj instanceof Number n) {
                return Math.max(0, Math.min(100, n.intValue()));
            }
            String raw = scoreObj.toString().replace(",", ".").trim();
            if (raw.isEmpty()) return fallback;
            int parsed = (int) Math.round(Double.parseDouble(raw));
            return Math.max(0, Math.min(100, parsed));
        } catch (Exception ignored) {
            return fallback;
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
        return normalized;
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
