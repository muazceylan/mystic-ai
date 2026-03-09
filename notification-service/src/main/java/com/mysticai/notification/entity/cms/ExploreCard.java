package com.mysticai.notification.entity.cms;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "explore_cards")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExploreCard {

    public enum Status { DRAFT, PUBLISHED, ARCHIVED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String cardKey;

    @Column(nullable = false, length = 100)
    private String categoryKey;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(length = 500)
    private String subtitle;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 1000)
    private String imageUrl;

    @Column(length = 100)
    private String routeKey;

    @Column(length = 100)
    private String fallbackRouteKey;

    @Column(length = 100)
    private String ctaLabel;

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
    @JsonProperty("isFeatured")
    private boolean isFeatured = false;

    @Column(nullable = false)
    @Builder.Default
    @JsonProperty("isPremium")
    private boolean isPremium = false;

    @Column(nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    private LocalDateTime startDate;
    private LocalDateTime endDate;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String locale = "tr";

    @Column(columnDefinition = "TEXT")
    private String payloadJson;

    private Long createdByAdminId;
    private Long updatedByAdminId;
    private LocalDateTime publishedAt;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
