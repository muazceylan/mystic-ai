package com.mysticai.orchestrator.dto;

import java.io.Serializable;
import java.util.List;

public record TarotInterpretationRequest(
        Long readingId,
        String userId,
        String question,
        List<CardInfo> cards
) implements Serializable {

    public record CardInfo(
            String name,
            String position,
            boolean reversed,
            String keywords
    ) implements Serializable {
    }
}
