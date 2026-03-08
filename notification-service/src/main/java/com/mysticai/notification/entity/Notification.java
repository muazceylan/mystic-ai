package com.mysticai.notification.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notif_user_id", columnList = "user_id"),
        @Index(name = "idx_notif_user_status", columnList = "user_id, status"),
        @Index(name = "idx_notif_user_created", columnList = "user_id, created_at"),
        @Index(name = "idx_notif_dedup", columnList = "dedup_key")
})
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

    @Column(name = "correlation_id")
    private UUID correlationId;

    // nullable=true: ddl-auto:update cannot add NOT NULL columns to existing tables with rows.
    // Integrity enforced by Builder defaults and service layer.
    @Column(name = "type")
    @Enumerated(EnumType.STRING)
    private NotificationType type;

    @Column(name = "category")
    @Enumerated(EnumType.STRING)
    private NotificationCategory category;

    @Column(name = "title")
    private String title;

    @Column(name = "body", length = 1000)
    private String body;

    @Column(name = "deeplink")
    private String deeplink;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private NotificationStatus status = NotificationStatus.UNREAD;

    @Column(name = "delivery_channel")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DeliveryChannel deliveryChannel = DeliveryChannel.BOTH;

    @Column(name = "priority")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Priority priority = Priority.NORMAL;

    @Column(name = "is_push_sent")
    @Builder.Default
    private Boolean pushSent = false;

    @Column(name = "is_delivered")
    @Builder.Default
    private Boolean delivered = false;

    @Column(name = "source_module")
    private String sourceModule;

    @Column(name = "dedup_key", unique = true)
    private String dedupKey;

    @Column(name = "metadata", length = 4000)
    private String metadata;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    /** seenAt = user opened notification center and this appeared in viewport.
     *  readAt = user tapped the notification and opened its content. */
    @Column(name = "seen_at")
    private LocalDateTime seenAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    /** templateKey identifies the notification template used (e.g. "daily_summary_v1") */
    @Column(name = "template_key")
    private String templateKey;

    /** variantKey identifies the specific variant selected (e.g. "v0", "v1") */
    @Column(name = "variant_key")
    private String variantKey;

    @Column(name = "analysis_type")
    @Enumerated(EnumType.STRING)
    private AnalysisType analysisType;

    public enum NotificationType {
        DAILY_SUMMARY,
        ENERGY_UPDATE,
        WEEKLY_SUMMARY,
        PRAYER_REMINDER,
        MEDITATION_REMINDER,
        PLANNER_REMINDER,
        EVENING_CHECKIN,
        DREAM_REMINDER,
        RE_ENGAGEMENT,
        COMPATIBILITY_UPDATE,
        AI_ANALYSIS_COMPLETE,
        PRODUCT_UPDATE,
        MINI_INSIGHT
    }

    public enum NotificationCategory {
        DAILY,
        INTRADAY,
        WEEKLY,
        REMINDER,
        BEHAVIORAL,
        SYSTEM
    }

    public enum NotificationStatus {
        UNREAD,
        READ
    }

    public enum DeliveryChannel {
        PUSH,
        IN_APP,
        BOTH
    }

    public enum Priority {
        LOW,
        NORMAL,
        HIGH
    }

    public enum AnalysisType {
        DREAM,
        TAROT,
        ASTROLOGY,
        NUMEROLOGY,
        NATAL_CHART,
        ORACLE,
        COMPATIBILITY,
        HOROSCOPE,
    }

    public void markAsRead() {
        this.status = NotificationStatus.READ;
        if (this.readAt == null) {
            this.readAt = LocalDateTime.now();
        }
        // Reading implies seeing
        if (this.seenAt == null) {
            this.seenAt = LocalDateTime.now();
        }
    }

    public void markAsSeen() {
        if (this.seenAt == null) {
            this.seenAt = LocalDateTime.now();
        }
    }

    public boolean isSeen() {
        return this.seenAt != null;
    }
}
