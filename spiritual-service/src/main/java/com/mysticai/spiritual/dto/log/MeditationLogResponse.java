package com.mysticai.spiritual.dto.log;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record MeditationLogResponse(
        Long id,
        Long userId,
        LocalDate date,
        Long exerciseId,
        Integer targetDurationSec,
        Integer actualDurationSec,
        Integer completedCycles,
        String moodBefore,
        String moodAfter,
        String status,
        LocalDateTime createdAt
) {
}

