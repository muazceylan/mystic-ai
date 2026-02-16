package com.mysticai.auth.dto;

public record CheckEmailResponse(
        boolean available,
        String message
) {
}
