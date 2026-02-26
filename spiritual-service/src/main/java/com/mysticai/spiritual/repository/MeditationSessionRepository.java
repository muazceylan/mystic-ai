package com.mysticai.spiritual.repository;

import com.mysticai.spiritual.entity.MeditationSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface MeditationSessionRepository extends JpaRepository<MeditationSession, Long> {
    List<MeditationSession> findAllByUserIdAndSessionDateBetweenOrderBySessionDateDesc(Long userId, LocalDate from, LocalDate to);
}

