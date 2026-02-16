package com.mysticai.common.event;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response event sent back to source services after AI analysis is complete.
 */
public record AiAnalysisResponseEvent(
        UUID correlationId,
        Long userId,
        String originalPayload,
        AiAnalysisEvent.SourceService sourceService,
        AiAnalysisEvent.AnalysisType analysisType,
        String interpretation,
        boolean success,
        String errorMessage,
        LocalDateTime processedAt
) {
    
    public static AiAnalysisResponseEvent success(
            AiAnalysisEvent request,
            String interpretation
    ) {
        return new AiAnalysisResponseEvent(
                request.correlationId(),
                request.userId(),
                request.payload(),
                request.sourceService(),
                request.analysisType(),
                interpretation,
                true,
                null,
                LocalDateTime.now()
        );
    }
    
    public static AiAnalysisResponseEvent failure(
            AiAnalysisEvent request,
            String errorMessage
    ) {
        return new AiAnalysisResponseEvent(
                request.correlationId(),
                request.userId(),
                request.payload(),
                request.sourceService(),
                request.analysisType(),
                null,
                false,
                errorMessage,
                LocalDateTime.now()
        );
    }

    /**
     * Extracts the dream ID from the original payload.
     */
    public Long getDreamId() {
        if (originalPayload == null || !originalPayload.contains("dreamId")) {
            return null;
        }

        try {
            int start = originalPayload.indexOf("dreamId") + 9;
            int end = originalPayload.indexOf(",", start);
            if (end == -1) {
                end = originalPayload.indexOf("}", start);
            }
            String idStr = originalPayload.substring(start, end).trim();
            return Long.parseLong(idStr);
        } catch (Exception e) {
            return null;
        }
    }
}
