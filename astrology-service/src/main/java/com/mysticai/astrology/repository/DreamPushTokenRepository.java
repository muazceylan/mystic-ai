package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.DreamPushToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DreamPushTokenRepository extends JpaRepository<DreamPushToken, Long> {
    List<DreamPushToken> findAllByUserId(Long userId);
    Optional<DreamPushToken> findByToken(String token);
    void deleteByToken(String token);
}
