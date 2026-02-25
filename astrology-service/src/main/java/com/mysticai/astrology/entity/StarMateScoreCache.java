package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "star_mate_score_cache",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_star_mate_score_cache",
                columnNames = {"viewer_user_id", "candidate_user_id", "relationship_type"}
        ))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StarMateScoreCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "viewer_user_id", nullable = false)
    private Long viewerUserId;

    @Column(name = "candidate_user_id", nullable = false)
    private Long candidateUserId;

    @Column(name = "relationship_type", nullable = false)
    private String relationshipType;

    @Column(name = "compatibility_score")
    private Integer compatibilityScore;

    @Column(name = "compatibility_summary", columnDefinition = "TEXT")
    private String compatibilitySummary;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StarMateScoreCacheStatus status;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "calculated_at")
    private LocalDateTime calculatedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        if (relationshipType == null || relationshipType.isBlank()) {
            relationshipType = "LOVE";
        }
        if (status == null) {
            status = StarMateScoreCacheStatus.PENDING;
        }
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
