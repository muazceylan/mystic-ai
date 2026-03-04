package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.DailyActionState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyActionStateRepository extends JpaRepository<DailyActionState, Long> {
    List<DailyActionState> findByUserIdAndActionDate(Long userId, LocalDate actionDate);

    Optional<DailyActionState> findByUserIdAndActionDateAndActionId(Long userId, LocalDate actionDate, String actionId);
}

