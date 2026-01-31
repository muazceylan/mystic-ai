package com.mysticai.tarot.dto;

import jakarta.validation.constraints.NotBlank;

public record TarotReadingRequest(
        @NotBlank(message = "Question is required")
        String question
) {
}
