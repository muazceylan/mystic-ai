package com.mysticai.notification.entity.monetization;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "module_monetization_rules",
        uniqueConstraints = @UniqueConstraint(columnNames = {"moduleKey", "configVersion"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModuleMonetizationRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String moduleKey;

    @Builder.Default
    @JsonProperty("isEnabled")
    private boolean isEnabled = false;

    @Builder.Default
    @JsonProperty("isAdsEnabled")
    private boolean isAdsEnabled = false;

    @Builder.Default
    @JsonProperty("isGuruEnabled")
    private boolean isGuruEnabled = false;

    @Builder.Default
    @JsonProperty("isGuruPurchaseEnabled")
    private boolean isGuruPurchaseEnabled = false;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AdStrategy adStrategy = AdStrategy.ON_ENTRY;

    @Builder.Default
    private String adProvider = "admob";

    @Builder.Default
    private String adFormats = "rewarded";

    @Builder.Default
    private int firstNEntriesWithoutAd = 1;

    @Builder.Default
    private int adOfferStartEntry = 2;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AdOfferFrequencyMode adOfferFrequencyMode = AdOfferFrequencyMode.EVERY_N_ENTRIES;

    @Builder.Default
    private int minimumSessionsBetweenOffers = 1;

    @Builder.Default
    private int minimumHoursBetweenOffers = 4;

    @Builder.Default
    private int dailyOfferCap = 3;

    @Builder.Default
    private int weeklyOfferCap = 15;

    @Builder.Default
    @JsonProperty("isOnlyUserTriggeredOffer")
    private boolean isOnlyUserTriggeredOffer = false;

    @Builder.Default
    @JsonProperty("isShowOfferOnDetailClick")
    private boolean isShowOfferOnDetailClick = false;

    @Builder.Default
    @JsonProperty("isShowOfferOnSecondEntry")
    private boolean isShowOfferOnSecondEntry = false;

    @Builder.Default
    private int guruRewardAmountPerCompletedAd = 1;

    @Column(columnDefinition = "TEXT")
    private String guruCostsByActionJson;

    @Builder.Default
    @JsonProperty("isAllowFreePreview")
    private boolean isAllowFreePreview = true;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PreviewDepthMode previewDepthMode = PreviewDepthMode.SUMMARY_ONLY;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RolloutStatus rolloutStatus = RolloutStatus.DISABLED;

    @Column(columnDefinition = "TEXT")
    private String platformOverridesJson;

    @Column(columnDefinition = "TEXT")
    private String localeOverridesJson;

    @Builder.Default
    private int configVersion = 1;

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

    public enum AdStrategy {
        ON_ENTRY,
        ON_DETAIL_CLICK,
        ON_CTA_CLICK,
        USER_TRIGGERED_ONLY,
        MIXED
    }

    public enum AdOfferFrequencyMode {
        EVERY_N_ENTRIES,
        TIME_BASED,
        SESSION_BASED,
        COMBINED
    }

    public enum PreviewDepthMode {
        NONE,
        SUMMARY_ONLY,
        PARTIAL_CONTENT,
        FULL_WITH_BLUR
    }

    public enum RolloutStatus {
        DISABLED,
        INTERNAL_ONLY,
        PERCENTAGE_ROLLOUT,
        ENABLED
    }
}
