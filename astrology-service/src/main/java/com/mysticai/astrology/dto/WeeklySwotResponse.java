package com.mysticai.astrology.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDate;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record WeeklySwotResponse(
        SwotPoint strength,
        SwotPoint weakness,
        SwotPoint opportunity,
        SwotPoint threat,
        FlashInsight flashInsight,
        LocalDate weekStart,
        LocalDate weekEnd
) {
    public record SwotPoint(
            String category,
            String headline,
            String subtext,
            int intensity,
            String quickTip
    ) {}

    public record FlashInsight(
            String type,
            String headline,
            String detail
    ) {}
}
