package com.mysticai.astrology.dto;

import jakarta.validation.constraints.NotNull;

public record StarMateActionRequest(
        @NotNull Long userId,
        @NotNull Long targetUserId,
        /** LIKE, DISLIKE, SUPERLIKE or NOPE (alias) */
        @NotNull String actionType
) {}
