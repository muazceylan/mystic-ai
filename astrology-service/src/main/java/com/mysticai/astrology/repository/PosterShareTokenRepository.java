package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.PosterShareToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PosterShareTokenRepository extends JpaRepository<PosterShareToken, Long> {
    Optional<PosterShareToken> findByToken(String token);
    boolean existsByToken(String token);
    long deleteByExpiresAtBefore(LocalDateTime now);
}

