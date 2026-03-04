package com.mysticai.astrology.dto.daily;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record DailyFeedbackRequest(
        @NotNull LocalDate date,
        @NotBlank String itemType,
        @NotBlank String itemId,
        @NotBlank String sentiment,
        @Size(max = 500) String note
) {}

