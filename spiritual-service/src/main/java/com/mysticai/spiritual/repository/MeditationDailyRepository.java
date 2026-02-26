package com.mysticai.spiritual.repository;

import com.mysticai.spiritual.entity.MeditationDaily;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MeditationDailyRepository extends JpaRepository<MeditationDaily, Long> {
    Optional<MeditationDaily> findFirstByDailyDateAndLocaleAndSelectionScopeAndUserIdIsNull(
            LocalDate dailyDate, String locale, String selectionScope
    );

    List<MeditationDaily> findAllByDailyDateBetweenAndLocaleAndSelectionScopeAndUserIdIsNullOrderByDailyDateDesc(
            LocalDate from, LocalDate to, String locale, String selectionScope
    );
}

