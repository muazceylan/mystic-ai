package com.mysticai.common.event;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Shared event model for AI analysis requests.
 * Used by all services (Dream, Tarot, Astrology, etc.) to send analysis requests to AI Orchestrator.
 */
public record AiAnalysisEvent(
        UUID correlationId,
        Long userId,
        String payload,
        SourceService sourceService,
        AnalysisType analysisType,
        LocalDateTime timestamp
) {
    
    public AiAnalysisEvent(Long userId, String payload, SourceService sourceService, AnalysisType analysisType) {
        this(
                UUID.randomUUID(),
                userId,
                payload,
                sourceService,
                analysisType,
                LocalDateTime.now()
        );
    }

    public enum SourceService {
        DREAM,
        TAROT,
        ASTROLOGY,
        NUMEROLOGY,
        VISION
    }

    public enum AnalysisType {
        INTERPRETATION,
        SUMMARY,
        PREDICTION,
        GUIDANCE,
        SWOT,
        PERIODIC,
        NATAL_CHART,
        VISION
    }
}
