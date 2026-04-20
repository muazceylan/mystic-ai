package com.mysticai.notification.entity.monetization;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "monetization_actions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"actionKey", "moduleKey"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonetizationAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String actionKey;

    @Column(nullable = false)
    private String moduleKey;

    private String displayName;
    private String description;
    private String dialogTitle;

    @Column(columnDefinition = "TEXT")
    private String dialogDescription;

    private String primaryCtaLabel;
    private String secondaryCtaLabel;
    private String analyticsKey;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private UnlockType unlockType = UnlockType.GURU_SPEND;

    @Builder.Default
    private int guruCost = 1;

    @Builder.Default
    private int rewardAmount = 0;

    @Builder.Default
    @JsonProperty("isRewardFallbackEnabled")
    private boolean isRewardFallbackEnabled = false;

    @Builder.Default
    @JsonProperty("isAdRequired")
    private boolean isAdRequired = false;

    @Builder.Default
    @JsonProperty("isPurchaseRequired")
    private boolean isPurchaseRequired = false;

    @Builder.Default
    @JsonProperty("isPreviewAllowed")
    private boolean isPreviewAllowed = true;

    @Builder.Default
    @JsonProperty("isEnabled")
    private boolean isEnabled = true;

    @Builder.Default
    private int displayPriority = 0;

    @Builder.Default
    private int dailyLimit = 0;

    @Builder.Default
    private int weeklyLimit = 0;

    private Long createdByAdminId;
    private Long updatedByAdminId;

    @Column(updatable = false)
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum UnlockType {
        FREE,
        AD_WATCH,
        GURU_SPEND,
        AD_OR_GURU,
        PURCHASE_ONLY
    }
}
