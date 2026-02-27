package com.mysticai.spiritual.dto.daily;

import java.time.LocalDate;

public record DailyMeditationResponse(
        LocalDate date,
        String scope,
        Long exerciseId,
        String title,
        String titleTr,
        String description,
        String benefitsJson,
        String type,
        String focusTheme,
        String difficulty,
        String icon,
        Integer durationSec,
        String stepsJson,
        String breathingPatternJson,
        String animationMode,
        Boolean backgroundAudioEnabledByDefault,
        String disclaimerText
) {
}

