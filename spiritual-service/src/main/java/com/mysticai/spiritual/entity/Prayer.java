package com.mysticai.spiritual.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "prayers", indexes = {
        @Index(name = "idx_prayers_category_active", columnList = "category, active"),
        @Index(name = "idx_prayers_active", columnList = "active")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 120)
    private String slug;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 64)
    private String category;

    @Column(name = "source_label", nullable = false, length = 32)
    private String sourceLabel;

    @Column(name = "source_note", columnDefinition = "TEXT")
    private String sourceNote;

    @Column(name = "arabic_text", columnDefinition = "TEXT")
    private String arabicText;

    @Column(name = "transliteration_tr", columnDefinition = "TEXT", nullable = false)
    private String transliterationTr;

    @Column(name = "meaning_tr", columnDefinition = "TEXT", nullable = false)
    private String meaningTr;

    @Column(name = "recommended_repeat_count", nullable = false)
    private Integer recommendedRepeatCount;

    @Column(name = "estimated_read_seconds", nullable = false)
    private Integer estimatedReadSeconds;

    @Column(name = "is_favoritable", nullable = false)
    private Boolean isFavoritable;

    @Column(name = "disclaimer_text", columnDefinition = "TEXT")
    private String disclaimerText;

    @Column(name = "difficulty_level")
    private Integer difficultyLevel;

    @Column(nullable = false)
    private Boolean active;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (active == null) active = true;
        if (isFavoritable == null) isFavoritable = true;
        if (recommendedRepeatCount == null) recommendedRepeatCount = 1;
        if (difficultyLevel == null) difficultyLevel = 1;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

