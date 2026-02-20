package com.mysticai.astrology.dto;

import java.time.LocalDate;
import java.util.List;

public record LuckyDateCard(
        LocalDate date,
        int successScore,
        String reason,
        List<String> supportingAspects,
        boolean mercuryRetrograde,
        String moonPhase
) {}
