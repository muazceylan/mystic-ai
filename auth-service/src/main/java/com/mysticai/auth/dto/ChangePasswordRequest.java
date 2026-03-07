package com.mysticai.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import static com.mysticai.auth.validation.PasswordPolicy.STRONG_PASSWORD_REGEX;
import static com.mysticai.auth.validation.PasswordPolicy.WEAK_PASSWORD_CODE;

public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 8) @Pattern(regexp = STRONG_PASSWORD_REGEX, message = WEAK_PASSWORD_CODE) String newPassword,
        @NotBlank String confirmPassword
) {
}
