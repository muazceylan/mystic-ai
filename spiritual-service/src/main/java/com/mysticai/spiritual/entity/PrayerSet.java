package com.mysticai.spiritual.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "prayer_sets", indexes = {
        @Index(name = "idx_prayer_sets_user_date", columnList = "user_id, set_date"),
        @Index(name = "idx_prayer_sets_date", columnList = "set_date")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrayerSet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "set_date", nullable = false)
    private LocalDate setDate;

    @Column(nullable = false, length = 8)
    private String locale;

    @Column(name = "selection_scope", nullable = false, length = 16)
    private String selectionScope;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "algo_version", nullable = false, length = 32)
    private String algoVersion;

    @Column(name = "seed_hash", nullable = false, length = 64)
    private String seedHash;

    @Column(name = "set_size", nullable = false)
    private Integer setSize;

    @Column(name = "ab_variant", length = 16)
    private String abVariant;

    @Column(name = "generated_by", nullable = false, length = 16)
    private String generatedBy;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @PrePersist
    void onCreate() {
        if (generatedAt == null) generatedAt = LocalDateTime.now();
        if (generatedBy == null) generatedBy = "SYSTEM";
        if (locale == null) locale = "tr";
    }
}

