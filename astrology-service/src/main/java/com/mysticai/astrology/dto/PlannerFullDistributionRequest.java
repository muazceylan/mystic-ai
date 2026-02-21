package com.mysticai.astrology.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Request payload for full planner daily distribution.
 */
public record PlannerFullDistributionRequest(
        @NotNull Long userId,
        @Min(1) @Max(6) int monthsAhead,
        String userGender
) {
    public PlannerFullDistributionRequest {
        if (monthsAhead == 0) {
            monthsAhead = 3;
        }
    }
}
