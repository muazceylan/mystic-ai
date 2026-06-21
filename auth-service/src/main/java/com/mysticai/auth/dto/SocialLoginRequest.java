package com.mysticai.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record SocialLoginRequest(
        @NotBlank(message = "Provider is required")
        String provider,

        @NotBlank(message = "ID token is required")
        String idToken,

        String linkEmail,

        String linkPassword
) {
    public SocialLoginRequest(String provider, String idToken) {
        this(provider, idToken, null, null);
    }
}
