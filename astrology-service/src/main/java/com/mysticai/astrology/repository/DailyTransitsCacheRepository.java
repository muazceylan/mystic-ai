package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.DailyTransitsCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface DailyTransitsCacheRepository extends JpaRepository<DailyTransitsCache, Long> {
    Optional<DailyTransitsCache> findFirstByUserIdAndTransitDateAndTimezoneAndLocationVersionOrderByCreatedAtDesc(
            Long userId,
            LocalDate transitDate,
            String timezone,
            String locationVersion
    );
}

