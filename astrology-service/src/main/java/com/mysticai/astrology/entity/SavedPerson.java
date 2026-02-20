package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "saved_persons")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavedPerson {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private String name;
    private LocalDate birthDate;
    private LocalTime birthTime;
    private String birthLocation;
    private Double latitude;
    private Double longitude;
    private String timezone;

    /** Relationship category hint set by user: LOVE, BUSINESS, FRIENDSHIP, RIVAL */
    private String relationshipCategory;

    // ─── Calculated natal chart data ───────────────────────────────────
    private String sunSign;
    private String moonSign;
    private String risingSign;
    private Double ascendantDegree;
    private Double mcDegree;

    @Column(name = "planet_positions_json", columnDefinition = "TEXT")
    private String planetPositionsJson;

    @Column(name = "house_placements_json", columnDefinition = "TEXT")
    private String housePlacementsJson;

    @Column(name = "aspects_json", columnDefinition = "TEXT")
    private String aspectsJson;

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
}
