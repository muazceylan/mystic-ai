package com.mysticai.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LinkEmailVerifyOtpRequest(
        @NotBlank(message = "Email is required")
        String email,

        @NotBlank(message = "Code is required")
        String code
) {}
