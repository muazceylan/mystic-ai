package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "star_mate_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StarMateProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "photos_json", nullable = false, columnDefinition = "jsonb")
    private String photosJson;

    @Enumerated(EnumType.STRING)
    private StarMateGender gender;

    @Enumerated(EnumType.STRING)
    @Column(name = "interested_in", nullable = false)
    private StarMateShowMe interestedIn;

    @Column(name = "birth_date", nullable = false)
    private LocalDate birthDate;

    @Column(name = "location_label")
    private String locationLabel;

    private Double latitude;

    private Double longitude;

    @Column(name = "min_compatibility_age", nullable = false)
    private Integer minCompatibilityAge;

    @Column(name = "max_compatibility_age", nullable = false)
    private Integer maxCompatibilityAge;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (photosJson == null || photosJson.isBlank()) {
            photosJson = "[]";
        }
        if (interestedIn == null) {
            interestedIn = StarMateShowMe.EVERYONE;
        }
        if (minCompatibilityAge == null) {
            minCompatibilityAge = 18;
        }
        if (maxCompatibilityAge == null) {
            maxCompatibilityAge = 99;
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
        if (photosJson == null || photosJson.isBlank()) {
            photosJson = "[]";
        }
    }
}
