package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "natal_charts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NatalChart {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", columnDefinition = "VARCHAR(255)")
    private String userId;
    private String name;
    private LocalDate birthDate;
    private LocalTime birthTime;
    private String birthLocation;
    private Double latitude;
    private Double longitude;
    private String sunSign;
    private String moonSign;
    private String risingSign;
    private Double ascendantDegree;
    private Double mcDegree;
    private Double utcOffset;
    @Column(name = "planet_positions_json", columnDefinition = "TEXT")
    private String planetPositionsJson;
    @Column(name = "house_placements_json", columnDefinition = "TEXT")
    private String housePlacementsJson;
    @Column(name = "aspects_json", columnDefinition = "TEXT")
    private String aspectsJson;
    @Column(name = "ai_interpretation", columnDefinition = "TEXT")
    private String aiInterpretation;
    private String interpretationStatus;
    @Column(name = "requested_locale", length = 10)
    private String requestedLocale;
    private LocalDateTime calculatedAt;
    @PrePersist
    protected void onCreate() {
        calculatedAt = LocalDateTime.now();
    }
}
