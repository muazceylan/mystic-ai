package com.mysticai.astrology.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record DreamSubmitRequest(
        @NotNull Long userId,
        @NotBlank String text,
        LocalDate dreamDate,
        String audioUrl,
        String title,
        String locale,
        String emotionAfterWaking,
        List<String> userSelectedTags,
        Boolean useAstrology,
        Boolean dreamMemoryEnabled
) {}
