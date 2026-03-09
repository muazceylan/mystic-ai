package com.mysticai.notification.entity.cms;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "daily_horoscope_cms",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_daily_horoscope_sign_date_locale",
                columnNames = {"zodiac_sign", "date", "locale"}
        ))
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyHoroscopeCms {

    public enum Status {
        DRAFT, PUBLISHED, ARCHIVED
    }

    public enum SourceType {
        EXTERNAL_API, ADMIN_CREATED, ADMIN_OVERRIDDEN
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "zodiac_sign", nullable = false, length = 20)
    private WeeklyHoroscopeCms.ZodiacSign zodiacSign;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false, length = 10)
    private String locale; // "tr", "en"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private SourceType sourceType = SourceType.EXTERNAL_API;

    @Column(length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String shortSummary;

    @Column(columnDefinition = "TEXT")
    private String fullContent;

    // Domain sections
    @Column(columnDefinition = "TEXT")
    private String love;

    @Column(columnDefinition = "TEXT")
    private String career;

    @Column(columnDefinition = "TEXT")
    private String money;

    @Column(columnDefinition = "TEXT")
    private String health;

    @Column(length = 50)
    private String luckyColor;

    @Column(length = 20)
    private String luckyNumber;

    // Override control: when true, CMS content takes precedence over external API
    @Column(nullable = false)
    @Builder.Default
    @JsonProperty("isOverrideActive")
    private boolean isOverrideActive = false;

    // Raw JSON snapshot from external API
    @Column(columnDefinition = "TEXT")
    private String externalSnapshotJson;

    @Column(name = "ingested_at")
    private LocalDateTime ingestedAt;

    // Non-null when the last ingest attempt for this record failed
    @Column(columnDefinition = "TEXT")
    private String ingestError;

    private Long createdByAdminId;
    private Long updatedByAdminId;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
