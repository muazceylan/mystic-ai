package com.mysticai.auth.messaging;

public record PasswordResetEmailMessage(
        Long userId,
        String email,
        String rawToken,
        String correlationId,
        String locale
) {
}
