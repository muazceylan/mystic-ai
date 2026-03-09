package com.mysticai.notification.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "navigation_items")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NavigationItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String navKey;

    @Column(nullable = false)
    private String label;

    private String icon;

    /** References AppRouteRegistry.routeKey */
    @Column(nullable = false)
    private String routeKey;

    @Builder.Default
    @JsonProperty("isVisible")
    private boolean isVisible = true;

    @Builder.Default
    private int sortOrder = 0;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AppRouteRegistry.Platform platform = AppRouteRegistry.Platform.BOTH;

    /** Minimum app version required to show this item (semver, e.g. "1.2.0") */
    private String minAppVersion;

    @Builder.Default
    @JsonProperty("isPremium")
    private boolean isPremium = false;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    private Long createdBy;
    private Long updatedBy;
}
