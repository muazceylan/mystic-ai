package com.mysticai.notification.entity.monetization;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * An opaque, single-use reward session for a server-to-server (S2S) rewarded-ad
 * flow (e.g. ayeT Studios web rewarded video).
 *
 * WHY A SEPARATE MODEL FROM {@link RewardIntent}:
 * RewardIntent models the browser GPT/GAM claim flow (client posts a claim after
 * the ad grants). The provider S2S flow is different: the provider's servers call
 * our webhook directly with a {@code transaction_id} and an {@code external_identifier}
 * we minted. This entity is the {@code external_identifier} — an unguessable UUID
 * bound to exactly one user, so the callback can never be forged to target another
 * account and can never be replayed after the token is granted.
 *
 * The token balance / ledger themselves are NOT duplicated here — grants go through
 * the shared {@code GuruWalletService} / {@code GuruLedger}.
 */
@Entity
@Table(
    name = "reward_session",
    indexes = {
        @Index(name = "idx_rs_user_status",  columnList = "userId,status"),
        @Index(name = "idx_rs_provider",     columnList = "provider"),
        @Index(name = "idx_rs_expires",      columnList = "expiresAt")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RewardSession {

    /** The session id IS the opaque external_identifier handed to the provider. */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RewardProvider provider = RewardProvider.AYET;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RewardChannel channel = RewardChannel.WEB;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RewardSessionStatus status = RewardSessionStatus.CREATED;

    /** Client placement label (e.g. TOKEN_WALLET) — analytics grouping only. */
    private String placement;

    /**
     * Guru Tokens this session grants on success. Set from server config at
     * creation time; the callback never determines the amount.
     */
    @Column(nullable = false)
    private int rewardAmount;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime rewardedAt;

    private LocalDateTime updatedAt;

    @Version
    private Long version;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public boolean isExpired() {
        return expiresAt != null && LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean isClaimable() {
        return status == RewardSessionStatus.CREATED && !isExpired();
    }
}
