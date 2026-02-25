package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "star_mate_preferences")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StarMatePreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "max_distance_km", nullable = false)
    private Integer maxDistanceKm;

    @Column(name = "min_age", nullable = false)
    private Integer minAge;

    @Column(name = "max_age", nullable = false)
    private Integer maxAge;

    @Column(name = "min_compatibility_score", nullable = false)
    private Integer minCompatibilityScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "show_me", nullable = false)
    private StarMateShowMe showMe;

    @Column(name = "strict_distance", nullable = false)
    private boolean strictDistance;

    @Column(name = "strict_age", nullable = false)
    private boolean strictAge;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        applyDefaults();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        applyDefaults();
        updatedAt = LocalDateTime.now();
    }

    private void applyDefaults() {
        if (maxDistanceKm == null) maxDistanceKm = 100;
        if (minAge == null) minAge = 18;
        if (maxAge == null) maxAge = 99;
        if (minCompatibilityScore == null) minCompatibilityScore = 50;
        if (showMe == null) showMe = StarMateShowMe.EVERYONE;
    }
}
