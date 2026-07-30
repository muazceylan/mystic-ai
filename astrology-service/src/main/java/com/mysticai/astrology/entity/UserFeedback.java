package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "feedback",
        indexes = {
                @Index(name = "idx_feedback_user_date", columnList = "user_id,feedback_date"),
                @Index(name = "idx_feedback_item", columnList = "item_type,item_id")
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "feedback_date", nullable = false)
    private LocalDate feedbackDate;

    @Column(name = "item_type", nullable = false, length = 24)
    private String itemType;

    @Column(name = "item_id", nullable = false, length = 120)
    private String itemId;

    @Column(name = "sentiment", nullable = false, length = 16)
    private String sentiment;

    /**
     * Why the user reacted this way: HELPFUL / TOO_GENERIC / REPETITIVE / NOT_RELEVANT /
     * NOT_USEFUL. Drives the next plan generation, unlike the bare sentiment.
     */
    @Column(name = "reason", length = 32)
    private String reason;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}

