package com.mysticai.notification.entity.monetization;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "guru_product_catalog")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuruProductCatalog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String productKey;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ProductType productType = ProductType.CONSUMABLE;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(nullable = false)
    private int guruAmount;

    @Builder.Default
    private int bonusGuruAmount = 0;

    @Column(precision = 10, scale = 2)
    private BigDecimal price;

    @Builder.Default
    private String currency = "TRY";

    private String iosProductId;
    private String androidProductId;

    @Builder.Default
    @JsonProperty("isEnabled")
    private boolean isEnabled = false;

    @Builder.Default
    private int sortOrder = 0;

    private String badge;
    private String campaignLabel;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RolloutStatus rolloutStatus = RolloutStatus.DISABLED;

    @Column(columnDefinition = "TEXT")
    private String localeTargetingJson;

    @Column(columnDefinition = "TEXT")
    private String regionTargetingJson;

    private LocalDateTime startDate;
    private LocalDateTime endDate;

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

    public enum ProductType {
        CONSUMABLE,
        BUNDLE,
        SUBSCRIPTION_BONUS,
        PROMOTIONAL
    }

    public enum RolloutStatus {
        DISABLED,
        INTERNAL_ONLY,
        ENABLED
    }
}
