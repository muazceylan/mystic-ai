package com.mysticai.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import static com.mysticai.auth.validation.PasswordPolicy.STRONG_PASSWORD_REGEX;
import static com.mysticai.auth.validation.PasswordPolicy.WEAK_PASSWORD_CODE;

public record RegisterRequest(
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
        String username,

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        @Pattern(regexp = STRONG_PASSWORD_REGEX, message = WEAK_PASSWORD_CODE)
        String password,

        String firstName,
        String lastName,

        LocalDate birthDate,
        String birthTime,
        String birthLocation,

        String birthCountry,
        String birthCity,
        Boolean birthTimeUnknown,
        String timezone,
        String gender,
        String maritalStatus,
        String zodiacSign
) {
}
