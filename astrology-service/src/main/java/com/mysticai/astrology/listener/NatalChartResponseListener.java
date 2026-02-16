package com.mysticai.astrology.listener;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.astrology.entity.NatalChart;
import com.mysticai.astrology.repository.NatalChartRepository;
import com.mysticai.common.event.AiAnalysisResponseEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Listener for Natal Chart AI analysis responses from the AI Orchestrator.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NatalChartResponseListener {

    private final NatalChartRepository natalChartRepository;
    private final ObjectMapper objectMapper;

    @RabbitListener(queues = "ai.responses.astrology.queue")
    public void handleAiResponse(AiAnalysisResponseEvent event) {
        log.info("Received AI response for correlationId: {}", event.correlationId());

        // Only process NATAL_CHART analysis types
        if (event.analysisType() != com.mysticai.common.event.AiAnalysisEvent.AnalysisType.NATAL_CHART) {
            return;
        }

        try {
            // Parse payload to get chartId
            String payload = event.originalPayload();
            NatalChartPayload chartPayload = objectMapper.readValue(payload, NatalChartPayload.class);

            // Find and update the natal chart
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

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record NatalChartPayload(Long chartId) {}
}
