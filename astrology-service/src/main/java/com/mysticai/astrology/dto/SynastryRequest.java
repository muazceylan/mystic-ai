package com.mysticai.astrology.dto;

import jakarta.validation.constraints.NotNull;

public record SynastryRequest(
        @NotNull Long userId,
        /** Backward-compatible partner id (maps to personBId) */
        Long savedPersonId,
        /** Optional: if null, requester user's latest natal chart is used as Person A */
        Long personAId,
        /** Optional explicit Person B saved-person id (preferred for any-pair mode) */
        Long personBId,
        /** LOVE, BUSINESS, FRIENDSHIP, RIVAL */
        @NotNull String relationshipType,
        /** Optional requester user gender for comparison context and AI phrasing */
        String userGender,
        /** User's preferred language for the AI analysis: "tr" or "en" */
        String locale
) {}
