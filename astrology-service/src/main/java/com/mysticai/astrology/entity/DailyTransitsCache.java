package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "daily_transits_cache",
        indexes = {
                @Index(name = "idx_daily_transits_cache_lookup", columnList = "user_id,transit_date,timezone,location_version"),
                @Index(name = "idx_daily_transits_cache_expires", columnList = "expires_at")
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyTransitsCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "transit_date", nullable = false)
    private LocalDate transitDate;

    @Column(name = "timezone", nullable = false, length = 64)
    private String timezone;

    @Column(name = "location_version", nullable = false, length = 64)
    private String locationVersion;

    @Column(name = "payload_json", nullable = false, columnDefinition = "TEXT")
    private String payloadJson;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}

