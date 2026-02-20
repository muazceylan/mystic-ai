package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "dream_push_tokens", indexes = {
        @Index(name = "idx_push_tokens_user_id", columnList = "user_id"),
        @Index(name = "idx_push_tokens_token", columnList = "token", unique = true)
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DreamPushToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Expo push token e.g. ExponentPushToken[xxxxxx] */
    @Column(name = "token", nullable = false, length = 512)
    private String token;

    @Column(name = "platform")
    private String platform; // ios | android

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
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
}
