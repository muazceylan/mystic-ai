package com.mysticai.spiritual.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "asma_daily", indexes = {
        @Index(name = "idx_asma_daily_user_date", columnList = "user_id, daily_date")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AsmaDaily {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "daily_date", nullable = false)
    private LocalDate dailyDate;

    @Column(nullable = false, length = 8)
    private String locale;

    @Column(name = "selection_scope", nullable = false, length = 16)
    private String selectionScope;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "asma_id", nullable = false)
    private Long asmaId;

    @Column(name = "algo_version", nullable = false, length = 32)
    private String algoVersion;

    @Column(name = "seed_hash", nullable = false, length = 64)
    private String seedHash;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @PrePersist
    void onCreate() {
        if (generatedAt == null) generatedAt = LocalDateTime.now();
        if (locale == null) locale = "tr";
    }
}

