package com.mysticai.notification.entity.cms;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "prayer_content")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrayerContent {

    public enum Status {
        DRAFT, PUBLISHED, ARCHIVED
    }

    public enum ContentType {
        DUA, ESMA, SURE
    }

    public enum Category {
        MORNING, EVENING, GRATITUDE, PROTECTION, HEALING,
        FORGIVENESS, GUIDANCE, ABUNDANCE, GENERAL
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String arabicText;

    @Column(columnDefinition = "TEXT")
    private String transliteration;

    @Column(columnDefinition = "TEXT")
    private String meaning;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ContentType contentType = ContentType.DUA;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private Category category = Category.GENERAL;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String locale = "tr"; // "tr", "en"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.DRAFT;

    // Recommended repetition count (e.g., 33, 99, 100)
    private Integer suggestedCount;

    // Comma-separated tags e.g. "sabah,şükür,koruma"
    @Column(length = 500)
    private String tags;

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
    @JsonProperty("isActive")
    private boolean isActive = true;

    // Optional audio URL for guided recitation
    @Column(length = 1000)
    private String audioUrl;

    private Long createdByAdminId;
    private Long updatedByAdminId;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
