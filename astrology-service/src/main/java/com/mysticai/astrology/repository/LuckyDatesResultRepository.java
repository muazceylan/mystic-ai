package com.mysticai.astrology.repository;

import com.mysticai.astrology.dto.GoalCategory;
import com.mysticai.astrology.entity.LuckyDatesResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LuckyDatesResultRepository extends JpaRepository<LuckyDatesResult, Long> {

    Optional<LuckyDatesResult> findFirstByUserIdAndGoalCategoryOrderByCreatedAtDesc(Long userId, GoalCategory goalCategory);

    List<LuckyDatesResult> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<LuckyDatesResult> findByCorrelationId(UUID correlationId);
}
