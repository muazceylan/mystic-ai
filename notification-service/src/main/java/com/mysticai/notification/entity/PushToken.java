package com.mysticai.notification.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "push_tokens", indexes = {
        @Index(name = "idx_push_token_user_id", columnList = "user_id"),
        @Index(name = "idx_push_token_token", columnList = "token", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PushToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "token", nullable = false, length = 512)
    private String token;

    @Column(name = "platform")
    private String platform;

    @Column(name = "device_id")
    private String deviceId;

    @Column(name = "app_version")
    private String appVersion;

    /** dev | staging | production */
    @Column(name = "environment")
    @Builder.Default
    private String environment = "production";

    @Column(name = "is_active")
    @Builder.Default
    private boolean active = true;

    /** Set when a push delivery is confirmed (not DeviceNotRegistered) */
    @Column(name = "last_delivered_at")
    private LocalDateTime lastDeliveredAt;

    /** Set when the token is registered or app restarts */
    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    /** Reason for deactivation: DeviceNotRegistered | InvalidCredentials | Expired | Unknown */
    @Column(name = "invalid_reason")
    private String invalidReason;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        lastSeenAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
