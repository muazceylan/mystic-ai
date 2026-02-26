package com.mysticai.spiritual.dto.log;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreatePrayerLogRequest(
        @NotNull LocalDate date,
        @NotNull Long prayerId,
        @NotNull @Min(1) @Max(100000) Integer count,
        @Size(max = 1000) String note,
        @Pattern(regexp = "MUTLU|SAKIN|GERGIN|YORGUN|ODAKLI|SUKURLU|DIGER") String mood
) {
}

