package com.mysticai.orchestrator.dto;

import java.io.Serializable;
import java.time.LocalDateTime;

public record TarotInterpretationResponse(
        Long readingId,
        String userId,
        String interpretation,
        LocalDateTime generatedAt,
        String model
) implements Serializable {
}
