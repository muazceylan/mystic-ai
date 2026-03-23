package com.mysticai.notification.entity.monetization;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "guru_ledger",
        indexes = {
                @Index(name = "idx_guru_ledger_user_id", columnList = "userId"),
                @Index(name = "idx_guru_ledger_user_created", columnList = "userId,createdAt"),
                @Index(name = "idx_guru_ledger_idempotency", columnList = "idempotencyKey", unique = true)
        })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuruLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionType transactionType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SourceType sourceType;

    private String sourceKey;
    private String moduleKey;
    private String actionKey;

    @Column(nullable = false)
    private int amount;

    @Column(nullable = false)
    private int balanceBefore;

    @Column(nullable = false)
    private int balanceAfter;

    private String platform;
    private String locale;

    @Column(columnDefinition = "TEXT")
    private String metadataJson;

    @Column(unique = true)
    private String idempotencyKey;

    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum TransactionType {
        REWARD_EARNED,
        GURU_SPENT,
        PURCHASE_COMPLETED,
        ADMIN_GRANT,
        ADMIN_REVOKE,
        REFUND_ADJUSTMENT,
        MIGRATION_ADJUSTMENT,
        WELCOME_BONUS
    }

    public enum SourceType {
        REWARDED_AD,
        ACTION_UNLOCK,
        GURU_PURCHASE,
        ADMIN,
        SYSTEM,
        PROMOTIONAL
    }
}
