package com.mysticai.astrology.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "star_mate_likes",
        uniqueConstraints = @UniqueConstraint(name = "uq_star_mate_like_pair", columnNames = {"liker_id", "liked_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StarMateLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "liker_id", nullable = false)
    private Long likerId;

    @Column(name = "liked_id", nullable = false)
    private Long likedId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StarMateLikeType type;

    @Column(name = "created_at", nullable = false)
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
