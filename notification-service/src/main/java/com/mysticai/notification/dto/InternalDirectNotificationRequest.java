package com.mysticai.notification.dto;

import jakarta.validation.constraints.NotBlank;

public record InternalDirectNotificationRequest(
        @NotBlank String title,
        @NotBlank String body,
        String deeplink,
        String type,
        String category,
        String priority,
        String deliveryChannel,
        String sourceModule,
        String templateKey,
        String variantKey,
        String metadata,
        String dedupKey,
        Integer expiresInHours
) {}
