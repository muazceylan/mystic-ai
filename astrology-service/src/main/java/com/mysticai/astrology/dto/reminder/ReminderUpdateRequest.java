package com.mysticai.astrology.dto.reminder;

import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public record ReminderUpdateRequest(
        LocalDate date,
        @Pattern(regexp = "^(?:[01]\\d|2[0-3]):[0-5]\\d$", message = "time HH:mm formatında olmalıdır.")
        String time,
        String timezone,
        Boolean enabled
) {}
