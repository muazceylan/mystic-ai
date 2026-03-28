package com.mysticai.auth.messaging;

public record EmailVerificationMessage(
        Long userId,
        String email,
        String rawToken,
        String correlationId,
        String locale
) {
}
