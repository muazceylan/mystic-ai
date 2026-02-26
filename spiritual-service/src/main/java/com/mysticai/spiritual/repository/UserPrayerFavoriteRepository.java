package com.mysticai.spiritual.repository;

import com.mysticai.spiritual.entity.UserPrayerFavorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserPrayerFavoriteRepository extends JpaRepository<UserPrayerFavorite, Long> {
    boolean existsByUserIdAndPrayerId(Long userId, Long prayerId);
    Optional<UserPrayerFavorite> findByUserIdAndPrayerId(Long userId, Long prayerId);
    List<UserPrayerFavorite> findAllByUserIdAndPrayerIdIn(Long userId, Collection<Long> prayerIds);
    List<UserPrayerFavorite> findAllByUserIdOrderByCreatedAtDesc(Long userId);
}

