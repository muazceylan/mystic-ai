package com.mysticai.auth.dto.password;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import static com.mysticai.auth.validation.PasswordPolicy.STRONG_PASSWORD_REGEX;
import static com.mysticai.auth.validation.PasswordPolicy.WEAK_PASSWORD_CODE;

public record ResetPasswordRequest(
        @NotBlank(message = "Token is required")
        String token,
        @NotBlank(message = "New password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        @Pattern(regexp = STRONG_PASSWORD_REGEX, message = WEAK_PASSWORD_CODE)
        String newPassword,
        @NotBlank(message = "Confirm password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        String confirmPassword
) {
}
