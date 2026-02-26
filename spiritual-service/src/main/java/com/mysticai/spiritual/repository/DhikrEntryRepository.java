package com.mysticai.spiritual.repository;

import com.mysticai.spiritual.entity.DhikrEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DhikrEntryRepository extends JpaRepository<DhikrEntry, Long> {
    Optional<DhikrEntry> findByUserIdAndEntryDateAndPrayerId(Long userId, LocalDate entryDate, Long prayerId);
    Optional<DhikrEntry> findByUserIdAndEntryDateAndAsmaId(Long userId, LocalDate entryDate, Long asmaId);
    List<DhikrEntry> findAllByUserIdAndEntryDateBetweenOrderByEntryDateDesc(Long userId, LocalDate from, LocalDate to);
    List<DhikrEntry> findAllByUserIdAndEntryDateAndPrayerIdIn(Long userId, LocalDate entryDate, Collection<Long> prayerIds);
}
