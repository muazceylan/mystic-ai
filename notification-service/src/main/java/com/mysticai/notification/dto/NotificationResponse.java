package com.mysticai.notification.dto;

import com.mysticai.notification.entity.Notification;

import java.time.LocalDateTime;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        Notification.NotificationType type,
        Notification.NotificationCategory category,
        String title,
        String body,
        String deeplink,
        String imageUrl,
        Notification.NotificationStatus status,
        Notification.Priority priority,
        String sourceModule,
        LocalDateTime createdAt,
        LocalDateTime readAt,
        LocalDateTime seenAt,
        String templateKey,
        String variantKey,
        String metadata,
        boolean pushSent
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
                n.getId(), n.getType(), n.getCategory(),
                n.getTitle(), n.getBody(), n.getDeeplink(), n.getImageUrl(),
                n.getStatus(), n.getPriority(), n.getSourceModule(),
                n.getCreatedAt(), n.getReadAt(), n.getSeenAt(),
                n.getTemplateKey(), n.getVariantKey(),
                n.getMetadata(), Boolean.TRUE.equals(n.getPushSent())
        );
    }
}
