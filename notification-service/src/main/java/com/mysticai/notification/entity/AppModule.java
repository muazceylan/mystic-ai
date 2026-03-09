package com.mysticai.notification.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "app_modules")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppModule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String moduleKey;

    @Column(nullable = false)
    private String displayName;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String icon;

    @Builder.Default
    @JsonProperty("isActive")
    private boolean isActive = true;

    @Builder.Default
    @JsonProperty("isPremium")
    private boolean isPremium = false;

    @Builder.Default
    private boolean showOnHome = true;

    @Builder.Default
    private boolean showOnExplore = false;

    @Builder.Default
    private boolean showInTabBar = false;

    @Builder.Default
    private int sortOrder = 0;

    private LocalDateTime startDate;
    private LocalDateTime endDate;

    private String badgeLabel;

    @Builder.Default
    private boolean maintenanceMode = false;

    /**
     * If true, the module is not shown in any UI surface (home/explore/tab)
     * but deeplinks to it remain functional. Useful for soft-hiding.
     */
    @Builder.Default
    private boolean hiddenButDeepLinkable = false;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    private Long createdBy;
    private Long updatedBy;
}
