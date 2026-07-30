package com.mysticai.astrology.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.util.UUID;

public record DreamExpansionResponse(
        UUID id,
        Long dreamId,
        DreamExpansionType expansionType,
        JsonNode result,
        int tokenCost,
        int currentBalance,
        String status,
        boolean usedExistingResult,
        String promptVersion,
        LocalDateTime createdAt
) {}
