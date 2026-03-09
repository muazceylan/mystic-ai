package com.mysticai.notification.entity.cms;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "home_sections")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HomeSection {

    public enum Status { DRAFT, PUBLISHED, ARCHIVED }

    public enum SectionType {
        HERO_BANNER, DAILY_HIGHLIGHT, QUICK_ACTIONS, FEATURED_CARD,
        MODULE_PROMO, WEEKLY_SUMMARY, PRAYER_HIGHLIGHT, CUSTOM_CARD_GROUP
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String sectionKey;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(length = 500)
    private String subtitle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    @Builder.Default
    private SectionType type = SectionType.FEATURED_CARD;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.DRAFT;

    @Column(nullable = false)
    @Builder.Default
    @JsonProperty("isActive")
    private boolean isActive = true;

    @Column(nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @Column(length = 100)
    private String routeKey;

    @Column(length = 100)
    private String fallbackRouteKey;

    @Column(length = 100)
    private String icon;

    @Column(length = 1000)
    private String imageUrl;

    @Column(length = 100)
    private String ctaLabel;

    @Column(length = 100)
    private String badgeLabel;

    private LocalDateTime startDate;
    private LocalDateTime endDate;

    @Column(columnDefinition = "TEXT")
    private String payloadJson;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String locale = "tr";

    private Long createdByAdminId;
    private Long updatedByAdminId;
    private LocalDateTime publishedAt;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
