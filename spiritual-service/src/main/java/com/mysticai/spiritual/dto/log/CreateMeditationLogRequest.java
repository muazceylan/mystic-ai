package com.mysticai.spiritual.dto.log;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateMeditationLogRequest(
        @NotNull LocalDate date,
        @NotNull Long exerciseId,
        @NotNull @Min(10) @Max(7200) Integer durationSec,
        @Min(0) @Max(10000) Integer completedCycles,
        @Pattern(regexp = "MUTLU|SAKIN|GERGIN|YORGUN|ODAKLI|SUKURLU|DIGER") String moodBefore,
        @Pattern(regexp = "MUTLU|SAKIN|GERGIN|YORGUN|ODAKLI|SUKURLU|DIGER") String moodAfter,
        @Size(max = 1000) String note
) {
}

