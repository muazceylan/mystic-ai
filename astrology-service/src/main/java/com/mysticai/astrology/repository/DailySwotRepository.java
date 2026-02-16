package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.DailySwot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Repository for DailySwot entity.
 */
@Repository
public interface DailySwotRepository extends JpaRepository<DailySwot, Long> {

    Optional<DailySwot> findByUserIdAndDate(Long userId, LocalDate date);

    Optional<DailySwot> findByUserIdAndSunSignAndDate(Long userId, String sunSign, LocalDate date);
}
