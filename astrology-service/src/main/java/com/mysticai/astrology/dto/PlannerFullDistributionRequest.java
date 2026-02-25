package com.mysticai.astrology.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/**
 * Request payload for full planner daily distribution.
 */
public record PlannerFullDistributionRequest(
        @NotNull Long userId,
        @Min(1) @Max(6) int monthsAhead,
        String userGender,
        String maritalStatus,
        String locale,
        PlannerResponseMode responseMode,
        List<PlannerCategory> categories,
        LocalDate startDate,
        LocalDate endDate
) {
    public PlannerFullDistributionRequest {
        if (monthsAhead == 0) {
            monthsAhead = 3;
        }
        if (responseMode == null) {
            responseMode = PlannerResponseMode.FULL;
        }
    }
}
