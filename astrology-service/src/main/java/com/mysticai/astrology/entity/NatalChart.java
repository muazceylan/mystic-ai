package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "natal_charts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NatalChart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "birth_date", nullable = false)
    private LocalDateTime birthDate;

    @Column(name = "birth_place")
    private String birthPlace;

    @Column(name = "birth_latitude")
    private Double birthLatitude;

    @Column(name = "birth_longitude")
    private Double birthLongitude;

    @Column(name = "sun_sign", nullable = false)
    @Enumerated(EnumType.STRING)
    private ZodiacSign sunSign;

    @Column(name = "moon_sign")
    @Enumerated(EnumType.STRING)
    private ZodiacSign moonSign;

    @Column(name = "rising_sign")
    @Enumerated(EnumType.STRING)
    private ZodiacSign risingSign;

    @Column(name = "sun_sign_turkish")
    private String sunSignTurkish;

    @Column(name = "moon_sign_turkish")
    private String moonSignTurkish;

    @Column(name = "rising_sign_turkish")
    private String risingSignTurkish;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
