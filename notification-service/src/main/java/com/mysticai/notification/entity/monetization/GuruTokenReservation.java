package com.mysticai.notification.entity.monetization;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "guru_token_reservations", indexes = {
        @Index(name = "idx_gtr_user_status_expires", columnList = "user_id,status,expires_at"),
        @Index(name = "idx_gtr_dream_type", columnList = "user_id,dream_id,expansion_type"),
        @Index(name = "idx_gtr_idempotency", columnList = "idempotency_key", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuruTokenReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "dream_id", nullable = false)
    private Long dreamId;

    @Column(name = "expansion_type", nullable = false, length = 48)
    private String expansionType;

    @Column(name = "action_key", nullable = false)
    private String actionKey;

    @Column(nullable = false)
    private int cost;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "idempotency_key", nullable = false, unique = true)
    private String idempotencyKey;

    @Column(name = "ledger_transaction_id")
    private UUID ledgerTransactionId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (expiresAt == null) {
            expiresAt = now.plusMinutes(10);
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum Status {
        PENDING,
        COMMITTED,
        CANCELLED,
        REFUNDED
    }
}
