package com.mysticai.notification.entity.monetization;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "rewarded_unlock_progress",
        indexes = {
                @Index(name = "idx_rup_user_module_action_status", columnList = "userId,moduleKey,actionKey,status"),
                @Index(name = "idx_rup_user_module_action_content_status", columnList = "userId,moduleKey,actionKey,contentKey,status"),
                @Index(name = "idx_rup_expires", columnList = "expiresAt")
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RewardedUnlockProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String moduleKey;

    @Column(nullable = false)
    private String actionKey;

    private String contentKey;

    @Column(nullable = false)
    private int requiredViews;

    @Builder.Default
    @Column(nullable = false)
    private int completedViews = 0;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private Status status = Status.IN_PROGRESS;

    private String lastClientEventId;
    private String lastTransactionId;

    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
    private LocalDateTime unlockedAt;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Version
    private Long version;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public boolean isActive(LocalDateTime now) {
        return status == Status.IN_PROGRESS && expiresAt != null && expiresAt.isAfter(now);
    }

    public enum Status {
        IN_PROGRESS,
        UNLOCKED,
        EXPIRED,
        CANCELLED
    }
}
