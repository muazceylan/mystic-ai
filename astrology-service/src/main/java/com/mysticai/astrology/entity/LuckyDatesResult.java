package com.mysticai.astrology.entity;

import com.mysticai.astrology.dto.GoalCategory;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "lucky_dates_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LuckyDatesResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    @Enumerated(EnumType.STRING)
    private GoalCategory goalCategory;

    @Column(name = "lucky_dates_json", columnDefinition = "TEXT")
    private String luckyDatesJson;

    @Column(name = "hook_text", columnDefinition = "TEXT")
    private String hookText;

    @Column(name = "ai_interpretation", columnDefinition = "TEXT")
    private String aiInterpretation;

    private String interpretationStatus;

    @Column(name = "correlation_id")
    private UUID correlationId;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
