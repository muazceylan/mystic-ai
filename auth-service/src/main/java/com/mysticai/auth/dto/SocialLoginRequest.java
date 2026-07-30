package com.mysticai.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SocialLoginRequest(
        @NotBlank(message = "Provider is required")
        String provider,

        @NotBlank(message = "ID token is required")
        String idToken,

        String linkEmail,

        String linkPassword,

        @Size(max = 100)
        String firstName,

        @Size(max = 100)
        String lastName
) {
    public SocialLoginRequest(String provider, String idToken) {
        this(provider, idToken, null, null, null, null);
    }

    public SocialLoginRequest(String provider, String idToken, String linkEmail, String linkPassword) {
        this(provider, idToken, linkEmail, linkPassword, null, null);
    }
}
