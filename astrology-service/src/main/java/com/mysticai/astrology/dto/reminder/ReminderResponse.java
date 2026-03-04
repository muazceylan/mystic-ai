package com.mysticai.astrology.dto.reminder;

import com.mysticai.astrology.entity.ReminderStatus;
import com.mysticai.astrology.entity.ReminderType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

public record ReminderResponse(
        Long id,
        LocalDate date,
        String time,
        String timezone,
        ReminderType type,
        ReminderStatus status,
        boolean enabled,
        Map<String, Object> payload,
        LocalDateTime dateTimeUtc,
        LocalDateTime sentAt,
        String messageTitle,
        String messageBody,
        String lastError,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
