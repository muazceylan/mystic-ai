package com.mysticai.notification.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing a notification for a user.
 * Stores AI analysis completion notifications with READ/UNREAD status.
 */
@Entity
@Table(name = "notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "correlation_id", nullable = false)
    private UUID correlationId;

    @Column(name = "analysis_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private AnalysisType analysisType;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "message", nullable = false, length = 1000)
    private String message;

    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private NotificationStatus status = NotificationStatus.UNREAD;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "payload", length = 4000)
    private String payload;

    public enum AnalysisType {
        DREAM,
        TAROT,
        ASTROLOGY,
        NUMEROLOGY,
        NATAL_CHART,
        ORACLE
    }

    public enum NotificationStatus {
        UNREAD,
        READ
    }

    /**
     * Marks the notification as read.
     */
    public void markAsRead() {
        this.status = NotificationStatus.READ;
        this.readAt = LocalDateTime.now();
    }
}
