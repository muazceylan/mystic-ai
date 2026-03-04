package com.mysticai.astrology.dto.daily;

public record DailyActionToggleResponse(
        String date,
        String actionId,
        boolean isDone,
        String doneAt
) {}

