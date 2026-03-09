package com.mysticai.notification.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_notifications")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminNotification {

    public enum Status {
        DRAFT, SCHEDULED, SENT, CANCELLED, FAILED
    }

    public enum TargetAudience {
        ALL_USERS, TEST_USERS, PREMIUM_USERS
    }

    // DeliveryChannel reuses Notification.DeliveryChannel to avoid duplication (PUSH/IN_APP/BOTH)

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String body;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Notification.NotificationCategory category = Notification.NotificationCategory.SYSTEM;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Notification.Priority priority = Notification.Priority.NORMAL;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Notification.DeliveryChannel deliveryChannel = Notification.DeliveryChannel.BOTH;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TargetAudience targetAudience = TargetAudience.ALL_USERS;

    // References AppRouteRegistry.routeKey
    private String routeKey;

    // Optional fallback
    private String fallbackRouteKey;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.DRAFT;

    private LocalDateTime scheduledAt;

    @Builder.Default
    @JsonProperty("isActive")
    private boolean isActive = true;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private Long createdByAdminId;
    private Long updatedByAdminId;

    // Populated after send
    private Integer sentCount;
    private Integer failedCount;
    private LocalDateTime sentAt;

    @Column(columnDefinition = "TEXT")
    private String failureReason;

    /** Optimistic lock — prevents duplicate scheduled dispatch in concurrent scenarios. */
    @Version
    private Long version;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
