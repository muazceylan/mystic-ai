package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity for storing daily SWOT analysis results.
 */
@Entity
@Table(name = "daily_swot")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailySwot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "sun_sign", length = 20)
    private String sunSign;

    @Column(name = "swot_date", nullable = false)
    private LocalDate date;

    @Column(name = "strengths", columnDefinition = "TEXT")
    private String strengths;

    @Column(name = "weaknesses", columnDefinition = "TEXT")
    private String weaknesses;

    @Column(name = "opportunities", columnDefinition = "TEXT")
    private String opportunities;

    @Column(name = "threats", columnDefinition = "TEXT")
    private String threats;

    @Column(name = "mystical_advice", columnDefinition = "TEXT")
    private String mysticalAdvice;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
