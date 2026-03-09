package com.mysticai.notification.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "app_route_registry")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppRouteRegistry {

    public enum Platform {
        IOS, ANDROID, BOTH
    }

    public enum SyncStatus {
        REGISTERED,           // manually registered, no auto-discovery
        DISCOVERED,           // discovered via manifest sync, confirmed in codebase
        DISCOVERED_UNREGISTERED, // found in manifest but not yet in registry
        STALE                 // was registered but not in latest manifest
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String routeKey;

    @Column(nullable = false)
    private String displayName;

    @Column(nullable = false)
    private String path;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String moduleKey;

    @Builder.Default
    private boolean requiresAuth = true;

    private String fallbackRouteKey;

    @Builder.Default
    @JsonProperty("isActive")
    private boolean isActive = true;

    @Builder.Default
    @JsonProperty("isDeprecated")
    private boolean isDeprecated = false;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Platform supportedPlatforms = Platform.BOTH;

    // Route discovery / auto-sync fields
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SyncStatus syncStatus = SyncStatus.REGISTERED;

    private String discoverySource;   // e.g. "route-manifest-v1", "manual"
    private LocalDateTime lastDiscoveredAt;

    @Column(nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    @JsonProperty("isStale")
    private boolean isStale = false;  // true if in registry but not in latest manifest

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    private Long createdBy;
    private Long updatedBy;
}
