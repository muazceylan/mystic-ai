package com.mysticai.astrology.entity;

import com.mysticai.astrology.dto.DreamExpansionType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "dream_analysis_expansions", indexes = {
        @Index(name = "idx_dae_user_dream", columnList = "user_id,dream_id"),
        @Index(name = "idx_dae_lookup", columnList = "user_id,dream_id,expansion_type,target_hash,status"),
        @Index(name = "idx_dae_idempotency", columnList = "idempotency_key", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DreamAnalysisExpansion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "dream_id", nullable = false)
    private Long dreamId;

    @Enumerated(EnumType.STRING)
    @Column(name = "expansion_type", nullable = false, length = 48)
    private DreamExpansionType expansionType;

    @Column(name = "target_hash", nullable = false, length = 64)
    private String targetHash;

    @Column(name = "result_json", columnDefinition = "TEXT")
    private String resultJson;

    @Column(name = "reservation_id")
    private UUID reservationId;

    @Column(name = "token_transaction_id")
    private UUID tokenTransactionId;

    @Column(name = "token_cost")
    private int tokenCost;

    @Column(name = "prompt_version", length = 64)
    private String promptVersion;

    @Column(name = "schema_version", length = 32)
    private String schemaVersion;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 180)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
