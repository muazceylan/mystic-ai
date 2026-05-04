package com.mysticai.notification.entity.monetization;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "monetization_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonetizationSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String settingsKey;

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

    @Builder.Default
    private String defaultAdProvider = "admob";

    @Builder.Default
    private String defaultCurrency = "TRY";

    @Builder.Default
    private int globalDailyAdCap = 10;

    @Builder.Default
    private int globalWeeklyAdCap = 50;

    @Builder.Default
    private int globalMinHoursBetweenOffers = 1;

    @Builder.Default
    private int globalMinSessionsBetweenOffers = 1;

    @Builder.Default
    @JsonProperty("isSignupBonusEnabled")
    private boolean isSignupBonusEnabled = false;

    @Builder.Default
    private int signupBonusTokenAmount = 10;

    @Builder.Default
    private String signupBonusLedgerReason = "SIGNUP_BONUS";

    @Builder.Default
    @JsonProperty("isSignupBonusOneTimeOnly")
    private boolean isSignupBonusOneTimeOnly = true;

    private String signupBonusRegistrationSource;
    private String signupBonusHelperText;

    // ─── Premium / Trial / Billing (Phase 1: foundation only) ─────────
    // Defaults are intentionally false / safe so the existing rewarded-ad +
    // guru-token flow keeps working unchanged when these fields are added
    // to currently-published settings rows.

    @Builder.Default
    @JsonProperty("isPremiumEnabled")
    private boolean premiumEnabled = false;

    @Builder.Default
    @JsonProperty("isTrialEnabled")
    private boolean trialEnabled = false;

    @Builder.Default
    private int defaultTrialDays = 0;

    @Builder.Default
    @JsonProperty("isTokenPurchaseEnabled")
    private boolean tokenPurchaseEnabled = false;

    @Builder.Default
    @JsonProperty("isRevenueCatEnabled")
    private boolean revenueCatEnabled = false;

    @Builder.Default
    @JsonProperty("isHideAdsForPremiumUsers")
    private boolean hideAdsForPremiumUsers = false;

    @Builder.Default
    @JsonProperty("isAllowPremiumAndTokenTogether")
    private boolean allowPremiumAndTokenTogether = true;

    @Column(columnDefinition = "TEXT")
    private String environmentRulesJson;

    @Column(columnDefinition = "TEXT")
    private String rolloutRulesJson;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.DRAFT;

    @Builder.Default
    private int configVersion = 1;

    private Long publishedByAdminId;
    private LocalDateTime publishedAt;
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

    public enum Status {
        DRAFT, PUBLISHED, ARCHIVED
    }
}
