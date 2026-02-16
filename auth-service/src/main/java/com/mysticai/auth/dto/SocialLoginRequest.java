package com.mysticai.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record SocialLoginRequest(
        @NotBlank(message = "Provider is required")
        String provider,

        @NotBlank(message = "ID token is required")
        String idToken
) {}
