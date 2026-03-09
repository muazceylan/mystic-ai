package com.mysticai.notification.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Notification Catalog Entry — definition of each notification type in the system.
 * Static backend definitions are seeded on startup by TriggerRegistrar.
 * Admin-panel definitions can be created/edited via the admin API.
 */
@Entity
@Table(name = "notification_definitions")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDefinition {

    public enum ChannelType { PUSH, IN_APP, BOTH }

    public enum CadenceType { HOURLY, DAILY, WEEKLY, EVENT_DRIVEN, MANUAL, SCHEDULED }

    public enum SourceType { STATIC_BACKEND, ADMIN_PANEL, HYBRID }

    public enum TriggerType { CRON, USER_ACTION, SYSTEM_EVENT, MANUAL }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 100)
    private String definitionKey;

    @Column(nullable = false, length = 200)
    private String displayName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 80)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ChannelType channelType = ChannelType.BOTH;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CadenceType cadenceType = CadenceType.DAILY;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SourceType sourceType = SourceType.STATIC_BACKEND;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TriggerType triggerType = TriggerType.CRON;

    @Column(length = 200)
    private String defaultRouteKey;

    @Column(length = 200)
    private String defaultFallbackRouteKey;

    /** Whether this definition is active and should produce notifications. */
    @Column(nullable = false)
    @Builder.Default
    @JsonProperty("isActive")
    private boolean isActive = true;

    /** Whether admin-panel users can edit this definition's fields. Static ones are not editable. */
    @Column(nullable = false)
    @Builder.Default
    @JsonProperty("isEditable")
    private boolean isEditable = false;

    @Column(nullable = false)
    @Builder.Default
    @JsonProperty("isVisibleInAdmin")
    private boolean isVisibleInAdmin = true;

    /** System-critical definitions cannot be disabled from the admin panel. */
    @Column(nullable = false)
    @Builder.Default
    @JsonProperty("isSystemCritical")
    private boolean isSystemCritical = false;

    @Column(length = 100)
    private String ownerModule;

    /** Reference to the Java class/method that implements this notification type. */
    @Column(length = 300)
    private String codeReference;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
