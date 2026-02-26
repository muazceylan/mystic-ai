package com.mysticai.spiritual.dto.daily;

import java.time.LocalDate;

public record DailyMeditationResponse(
        LocalDate date,
        String scope,
        Long exerciseId,
        String title,
        String type,
        String focusTheme,
        Integer durationSec,
        String stepsJson,
        String breathingPatternJson,
        String animationMode,
        Boolean backgroundAudioEnabledByDefault,
        String disclaimerText
) {
}

