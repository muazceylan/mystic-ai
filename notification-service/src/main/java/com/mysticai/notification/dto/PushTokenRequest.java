package com.mysticai.notification.dto;

import jakarta.validation.constraints.NotBlank;

public record PushTokenRequest(
        @NotBlank String token,
        String platform
) {}
