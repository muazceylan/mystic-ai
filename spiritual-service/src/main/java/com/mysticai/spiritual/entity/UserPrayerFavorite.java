package com.mysticai.spiritual.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_prayer_favorites", uniqueConstraints = {
        @UniqueConstraint(name = "uq_user_prayer_favorites_user_prayer", columnNames = {"user_id", "prayer_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPrayerFavorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "prayer_id", nullable = false)
    private Long prayerId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}

