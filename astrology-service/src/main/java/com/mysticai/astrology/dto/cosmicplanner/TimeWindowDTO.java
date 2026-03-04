package com.mysticai.astrology.dto.cosmicplanner;

public record TimeWindowDTO(
        String startTime,
        String endTime,
        TimeWindowType type,
        String reason
) {}
