package com.mysticai.spiritual.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "meditation_sessions", indexes = {
        @Index(name = "idx_meditation_sessions_user_date", columnList = "user_id, session_date"),
        @Index(name = "idx_meditation_sessions_user_started", columnList = "user_id, started_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeditationSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "exercise_id", nullable = false)
    private Long exerciseId;

    @Column(name = "target_duration_sec", nullable = false)
    private Integer targetDurationSec;

    @Column(name = "actual_duration_sec", nullable = false)
    private Integer actualDurationSec;

    @Column(name = "completed_cycles")
    private Integer completedCycles;

    @Column(name = "mood_before", length = 32)
    private String moodBefore;

    @Column(name = "mood_after", length = 32)
    private String moodAfter;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(nullable = false, length = 16)
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (startedAt == null) startedAt = createdAt;
        if (sessionDate == null) sessionDate = createdAt.toLocalDate();
        if (status == null) status = "COMPLETED";
    }
}

