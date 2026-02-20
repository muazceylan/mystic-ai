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
                java.util.Map<String, Object> parsed = objectMapper.readValue(aiJson, java.util.Map.class);
                synastry.setHarmonyInsight((String) parsed.get("harmonyInsight"));
                synastry.setKeyWarning((String) parsed.get("keyWarning"));
                synastry.setCosmicAdvice((String) parsed.get("cosmicAdvice"));
                synastry.setStrengthsJson(objectMapper.writeValueAsString(parsed.get("strengths")));
                synastry.setChallengesJson(objectMapper.writeValueAsString(parsed.get("challenges")));
                // AI-calculated harmony score overrides the Java-calculated value
                Object scoreObj = parsed.get("harmonyScore");
                if (scoreObj instanceof Number n) {
                    synastry.setHarmonyScore(Math.max(0, Math.min(100, n.intValue())));
                }
            } catch (Exception parseEx) {
                log.warn("Relationship analysis response was not JSON, storing as cosmicAdvice");
                synastry.setCosmicAdvice(aiJson);
                synastry.setStrengthsJson("[]");
                synastry.setChallengesJson("[]");
            }

            synastry.setStatus("COMPLETED");
            synastryRepository.save(synastry);
            log.info("Updated Synastry {} with AI relationship analysis", synastry.getId());
        } catch (Exception e) {
            log.error("Failed to process relationship analysis response", e);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record NatalChartPayload(Long chartId) {}
}
