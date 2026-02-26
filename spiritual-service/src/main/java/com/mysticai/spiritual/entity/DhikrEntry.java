package com.mysticai.spiritual.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "dhikr_entries", indexes = {
        @Index(name = "idx_dhikr_entries_user_date", columnList = "user_id, entry_date"),
        @Index(name = "idx_dhikr_entries_user_type_date", columnList = "user_id, entry_type, entry_date")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DhikrEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Column(name = "entry_type", nullable = false, length = 16)
    private String entryType;

    @Column(name = "prayer_id")
    private Long prayerId;

    @Column(name = "asma_id")
    private Long asmaId;

    @Column(name = "total_repeat_count", nullable = false)
    private Integer totalRepeatCount;

    @Column(name = "session_count", nullable = false)
    private Integer sessionCount;

    @Column(length = 32)
    private String mood;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(nullable = false, length = 16)
    private String source;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public static DhikrEntry newPrayerEntry(Long userId, LocalDate date, Long prayerId) {
        return DhikrEntry.builder()
                .userId(userId)
                .entryDate(date)
                .entryType("PRAYER")
                .prayerId(prayerId)
                .totalRepeatCount(0)
                .sessionCount(0)
                .source("FLOW")
                .build();
    }

    public static DhikrEntry newAsmaEntry(Long userId, LocalDate date, Long asmaId) {
        return DhikrEntry.builder()
                .userId(userId)
                .entryDate(date)
                .entryType("ASMA")
                .asmaId(asmaId)
                .totalRepeatCount(0)
                .sessionCount(0)
                .source("FLOW")
                .build();
    }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
        if (source == null) source = "MANUAL";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

