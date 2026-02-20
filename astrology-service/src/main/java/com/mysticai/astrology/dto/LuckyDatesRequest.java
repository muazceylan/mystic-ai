package com.mysticai.astrology.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record LuckyDatesRequest(
        @NotNull Long userId,
        @NotNull GoalCategory goalCategory,
        @Min(1) @Max(6) int monthsAhead
) {
    public LuckyDatesRequest {
        if (monthsAhead == 0) monthsAhead = 3;
    }
}
