package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Persisted natal interpretation, keyed by the facts that can invalidate it.
 *
 * <p>A natal chart never changes, so regenerating an interpretation on every screen open would be
 * pure cost with no benefit. The cache key is deliberately explicit — user, chart signature,
 * contract version, locale — so a prompt change, a contract bump or a language switch each produce
 * a fresh row while an ordinary revisit is a single indexed read.</p>
 */
@Entity
@Table(
        name = "natal_portraits",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_natal_portraits_scope",
                columnNames = {"user_id", "chart_signature", "interpretation_version", "locale"}
        ),
        indexes = {
                @Index(name = "idx_natal_portraits_user", columnList = "user_id"),
                @Index(name = "idx_natal_portraits_chart", columnList = "chart_id")
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NatalPortraitCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 255)
    private String userId;

    @Column(name = "chart_id")
    private Long chartId;

    /**
     * Hash of the birth data that produced the chart. Changing birth date, time or place changes
     * this, which is what makes a corrected birth time invalidate the old interpretation.
     */
    @Column(name = "chart_signature", nullable = false, length = 64)
    private String chartSignature;

    @Column(name = "interpretation_version", nullable = false, length = 40)
    private String interpretationVersion;

    @Column(nullable = false, length = 10)
    private String locale;

    /** READY or FAILED. Only READY rows are served. */
    @Column(nullable = false, length = 20)
    private String status;

    /** AI or FALLBACK — surfaced to the client so it can label a degraded generation. */
    @Column(nullable = false, length = 20)
    private String source;

    @Column(name = "portrait_json", nullable = false, columnDefinition = "TEXT")
    private String portraitJson;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
