package com.mysticai.astrology.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record DreamSubmitRequest(
        @NotNull Long userId,
        @NotBlank String text,
        LocalDate dreamDate,
        String audioUrl,
        String title,
        String locale
) {}
