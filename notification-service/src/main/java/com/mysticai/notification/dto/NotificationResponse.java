package com.mysticai.notification.dto;

import com.mysticai.notification.entity.Notification;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
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
        OffsetDateTime createdAt,
        OffsetDateTime readAt,
        OffsetDateTime seenAt,
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
                toOffsetDateTime(n.getCreatedAt()),
                toOffsetDateTime(n.getReadAt()),
                toOffsetDateTime(n.getSeenAt()),
                n.getTemplateKey(), n.getVariantKey(),
                n.getMetadata(), Boolean.TRUE.equals(n.getPushSent())
        );
    }

    private static OffsetDateTime toOffsetDateTime(LocalDateTime value) {
        if (value == null) {
            return null;
        }
        return value.atZone(ZoneId.systemDefault()).toOffsetDateTime();
    }
}
