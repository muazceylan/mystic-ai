package com.mysticai.astrology.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record DreamEntryResponse(
        Long id,
        Long userId,
        String text,
        LocalDate dreamDate,
        String audioUrl,
        String title,
        String interpretation,
        List<String> warnings,
        List<String> opportunities,
        List<String> recurringSymbols,
        List<String> extractedSymbols,
        UUID correlationId,
        String interpretationStatus,
        LocalDateTime createdAt
) {}
