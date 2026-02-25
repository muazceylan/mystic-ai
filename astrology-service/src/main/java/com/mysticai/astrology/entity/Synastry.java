package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "synastries")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Synastry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private Long savedPersonId;
    private Long personAId;
    private Long personBId;
    private String personAType;
    private String personBType;

    /** LOVE, BUSINESS, FRIENDSHIP, RIVAL */
    private String relationshipType;

    /** 0-100 calculated harmony score */
    private Integer harmonyScore;

    /** JSON array of CrossAspect objects between the two charts */
    @Column(name = "cross_aspects_json", columnDefinition = "TEXT")
    private String crossAspectsJson;

    /** AI-generated narrative: overall harmony insight */
    @Column(name = "harmony_insight", columnDefinition = "TEXT")
    private String harmonyInsight;

    /** JSON array of strength description strings */
    @Column(name = "strengths_json", columnDefinition = "TEXT")
    private String strengthsJson;

    /** JSON array of challenge description strings */
    @Column(name = "challenges_json", columnDefinition = "TEXT")
    private String challengesJson;

    /** One specific key warning from AI */
    @Column(name = "key_warning", columnDefinition = "TEXT")
    private String keyWarning;

    /** Main AI-generated synthesis paragraph */
    @Column(name = "cosmic_advice", columnDefinition = "TEXT")
    private String cosmicAdvice;

    /** PENDING, COMPLETED, FAILED */
    private String status;

    @Column(name = "correlation_id")
    private UUID correlationId;

    private LocalDateTime calculatedAt;

    @PrePersist
    protected void onCreate() {
        calculatedAt = LocalDateTime.now();
    }
}
