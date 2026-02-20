package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "monthly_dream_stories", indexes = {
        @Index(name = "idx_monthly_story_user_id", columnList = "user_id"),
        @Index(name = "idx_monthly_story_user_period", columnList = "user_id, year_month", unique = true)
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyDreamStory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Format: "2026-01" */
    @Column(name = "year_month", nullable = false, length = 7)
    private String yearMonth;

    @Column(name = "story", columnDefinition = "TEXT")
    private String story;

    @Column(name = "dream_count")
    private Integer dreamCount;

    @Column(name = "dominant_symbols_json", columnDefinition = "TEXT")
    private String dominantSymbolsJson;

    @Column(name = "status", length = 20)
    private String status; // PENDING | COMPLETED | FAILED

    @Column(name = "correlation_id")
    private UUID correlationId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
