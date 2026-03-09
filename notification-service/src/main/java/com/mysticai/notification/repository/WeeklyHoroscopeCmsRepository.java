package com.mysticai.notification.repository;

import com.mysticai.notification.entity.cms.DailyHoroscopeCms;
import com.mysticai.notification.entity.cms.WeeklyHoroscopeCms;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface WeeklyHoroscopeCmsRepository
        extends JpaRepository<WeeklyHoroscopeCms, Long>, JpaSpecificationExecutor<WeeklyHoroscopeCms> {

    Optional<WeeklyHoroscopeCms> findByZodiacSignAndWeekStartDateAndLocale(
            WeeklyHoroscopeCms.ZodiacSign zodiacSign, LocalDate weekStartDate, String locale);

    long countByStatus(WeeklyHoroscopeCms.Status status);

    // Count missing horoscopes for a given week: 12 signs total, returns how many are published
    long countByWeekStartDateAndLocaleAndStatus(LocalDate weekStartDate, String locale, WeeklyHoroscopeCms.Status status);

    /** True if a successful (no error) record exists for this sign+weekStart+locale. */
    boolean existsByZodiacSignAndWeekStartDateAndLocaleAndIngestErrorIsNull(
            WeeklyHoroscopeCms.ZodiacSign zodiacSign, LocalDate weekStartDate, String locale);
}
