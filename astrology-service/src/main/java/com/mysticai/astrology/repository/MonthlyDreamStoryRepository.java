package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.MonthlyDreamStory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MonthlyDreamStoryRepository extends JpaRepository<MonthlyDreamStory, Long> {
    Optional<MonthlyDreamStory> findByUserIdAndYearMonth(Long userId, String yearMonth);
    Optional<MonthlyDreamStory> findByCorrelationId(UUID correlationId);
}
