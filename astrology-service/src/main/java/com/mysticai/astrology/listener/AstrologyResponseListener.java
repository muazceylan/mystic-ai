package com.mysticai.astrology.listener;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
            try {
                @SuppressWarnings("unchecked")
                java.util.Map<String, Object> parsed = objectMapper.readValue(aiJson, java.util.Map.class);
                entry.setInterpretation((String) parsed.get("interpretation"));
                entry.setOpportunitiesJson(objectMapper.writeValueAsString(parsed.get("opportunities")));
                entry.setWarningsJson(objectMapper.writeValueAsString(parsed.get("warnings")));
            } catch (Exception parseEx) {
                // If AI didn't return JSON, store the raw text as interpretation
                log.warn("Dream synthesis response was not JSON, storing as raw text");
                entry.setInterpretation(aiJson);
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
}
