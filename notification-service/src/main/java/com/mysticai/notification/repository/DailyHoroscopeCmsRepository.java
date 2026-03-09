package com.mysticai.notification.repository;

import com.mysticai.notification.entity.cms.DailyHoroscopeCms;
import com.mysticai.notification.entity.cms.WeeklyHoroscopeCms;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyHoroscopeCmsRepository
        extends JpaRepository<DailyHoroscopeCms, Long>, JpaSpecificationExecutor<DailyHoroscopeCms> {

    Optional<DailyHoroscopeCms> findByZodiacSignAndDateAndLocale(
            WeeklyHoroscopeCms.ZodiacSign zodiacSign, LocalDate date, String locale);

    List<DailyHoroscopeCms> findByDateAndLocale(LocalDate date, String locale);

    long countByStatus(DailyHoroscopeCms.Status status);

    /** True if a successful (no error) record exists for this sign+date+locale. */
    boolean existsByZodiacSignAndDateAndLocaleAndIngestErrorIsNull(
            WeeklyHoroscopeCms.ZodiacSign zodiacSign, LocalDate date, String locale);
}
