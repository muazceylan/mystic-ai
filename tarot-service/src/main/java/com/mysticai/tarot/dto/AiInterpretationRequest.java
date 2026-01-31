package com.mysticai.tarot.dto;

import java.util.List;

public record AiInterpretationRequest(
        Long readingId,
        String question,
        List<CardForInterpretation> cards
) {
    public record CardForInterpretation(
            String name,
            String position,
            boolean reversed,
            String keywords
    ) {
    }
}
