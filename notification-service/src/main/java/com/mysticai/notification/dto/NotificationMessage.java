package com.mysticai.notification.dto;

import com.mysticai.notification.entity.Notification;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Record representing a notification message sent via WebSocket.
 */
public record NotificationMessage(
        UUID id,
        UUID correlationId,
        Notification.AnalysisType analysisType,
        String title,
        String message,
        Notification.NotificationStatus status,
        LocalDateTime createdAt,
        String payload
) {
    public NotificationMessage {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
