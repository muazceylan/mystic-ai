package com.mysticai.dream.dto;

import jakarta.validation.constraints.NotBlank;

public record DreamRequest(
        @NotBlank(message = "Dream text is required")
        String dreamText,
        
        @NotBlank(message = "Mood is required")
        String mood
) {
}
