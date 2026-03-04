package com.mysticai.astrology.dto.daily;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record DailyActionToggleRequest(
        @NotNull LocalDate date,
        @NotNull Boolean isDone
) {}

