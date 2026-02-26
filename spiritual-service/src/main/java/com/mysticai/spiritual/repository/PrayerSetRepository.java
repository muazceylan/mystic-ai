package com.mysticai.spiritual.repository;

import com.mysticai.spiritual.entity.PrayerSet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PrayerSetRepository extends JpaRepository<PrayerSet, Long> {
    Optional<PrayerSet> findFirstBySetDateAndLocaleAndSelectionScopeAndUserIdIsNull(
            LocalDate setDate, String locale, String selectionScope
    );

    List<PrayerSet> findAllBySetDateBetweenAndLocaleAndSelectionScopeAndUserIdIsNullOrderBySetDateDesc(
            LocalDate from, LocalDate to, String locale, String selectionScope
    );
}

