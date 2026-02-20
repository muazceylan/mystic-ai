package com.mysticai.astrology.dto;

import jakarta.validation.constraints.NotNull;

public record SynastryRequest(
        @NotNull Long userId,
        @NotNull Long savedPersonId,
        /** LOVE, BUSINESS, FRIENDSHIP, RIVAL */
        @NotNull String relationshipType,
        /** User's preferred language for the AI analysis: "tr" or "en" */
        String locale
) {}
