package com.mysticai.astrology.dto.reminder;

import com.mysticai.astrology.entity.ReminderType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;
import java.util.Map;

public record ReminderCreateRequest(
        @NotNull LocalDate date,
        @NotBlank
        @Pattern(regexp = "^(?:[01]\\d|2[0-3]):[0-5]\\d$", message = "time HH:mm formatında olmalıdır.")
        String time,
        @NotBlank String timezone,
        @NotNull ReminderType type,
        Map<String, Object> payload
) {}
