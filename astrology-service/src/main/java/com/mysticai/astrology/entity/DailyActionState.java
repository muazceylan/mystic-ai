package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "daily_actions",
        indexes = {
                @Index(name = "idx_daily_actions_user_date", columnList = "user_id,action_date"),
                @Index(name = "idx_daily_actions_done", columnList = "is_done")
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyActionState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "action_date", nullable = false)
    private LocalDate actionDate;

    @Column(name = "action_id", nullable = false, length = 120)
    private String actionId;

    @Column(name = "is_done", nullable = false)
    private boolean isDone;

    @Column(name = "done_at")
    private LocalDateTime doneAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

