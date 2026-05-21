package com.mysticai.notification.entity.monetization;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "rewarded_unlock_event",
        indexes = {
                @Index(name = "idx_rue_progress", columnList = "progressId"),
                @Index(name = "idx_rue_user_module_action_created", columnList = "userId,moduleKey,actionKey,createdAt"),
                @Index(name = "idx_rue_user_module_action_content_created", columnList = "userId,moduleKey,actionKey,contentKey,createdAt")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_rue_client_event_id", columnNames = "clientEventId"),
                @UniqueConstraint(name = "uq_rue_transaction_id", columnNames = "transactionId")
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RewardedUnlockEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID progressId;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String moduleKey;

    @Column(nullable = false)
    private String actionKey;

    @Column(length = 512)
    private String contentKey;

    @Column(nullable = false)
    private String clientEventId;

    private String transactionId;
    private String adNetwork;
    private String placement;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private EventType eventType = EventType.AD_COMPLETED;

    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum EventType {
        AD_COMPLETED
    }
}
