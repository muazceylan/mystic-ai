package com.mysticai.tarot.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "tarot_readings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TarotReading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String question;

    @Column(name = "spread_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private SpreadType spreadType;

    @Column(name = "past_card_id")
    private Long pastCardId;

    @Column(name = "past_reversed")
    private Boolean pastReversed;

    @Column(name = "present_card_id")
    private Long presentCardId;

    @Column(name = "present_reversed")
    private Boolean presentReversed;

    @Column(name = "future_card_id")
    private Long futureCardId;

    @Column(name = "future_reversed")
    private Boolean futureReversed;

    @Column(columnDefinition = "TEXT")
    private String interpretation;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ReadingStatus status = ReadingStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum SpreadType {
        THREE_CARD,
        SINGLE_CARD,
        CELTIC_CROSS
    }

    public enum ReadingStatus {
        PENDING,
        PROCESSING,
        COMPLETED,
        FAILED
    }
}
