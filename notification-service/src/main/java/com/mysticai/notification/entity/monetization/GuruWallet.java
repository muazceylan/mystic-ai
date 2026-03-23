package com.mysticai.notification.entity.monetization;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "guru_wallet",
        indexes = {
                @Index(name = "idx_guru_wallet_user_id", columnList = "userId", unique = true)
        })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuruWallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long userId;

    @Builder.Default
    private int currentBalance = 0;

    @Builder.Default
    private long lifetimeEarned = 0;

    @Builder.Default
    private long lifetimeSpent = 0;

    @Builder.Default
    private long lifetimePurchased = 0;

    private LocalDateTime lastEarnedAt;
    private LocalDateTime lastSpentAt;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private WalletStatus status = WalletStatus.ACTIVE;

    @Version
    private Long version;

    @Column(updatable = false)
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum WalletStatus {
        ACTIVE,
        SUSPENDED,
        FROZEN
    }
}
