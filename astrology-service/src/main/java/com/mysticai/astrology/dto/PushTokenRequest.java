package com.mysticai.astrology.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PushTokenRequest(
        @NotNull Long userId,
        @NotBlank String token,
        String platform
) {}
