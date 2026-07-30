package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.DailyPersonalPlan;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyPersonalPlanRepository extends JpaRepository<DailyPersonalPlan, Long> {

    Optional<DailyPersonalPlan> findByUserIdAndLocalDateAndLocaleAndStatus(
            Long userId, LocalDate localDate, String locale, DailyPersonalPlan.Status status);

    /**
     * Pessimistic lock used by the regeneration path so two concurrent feedback submissions
     * cannot both create a replacement plan for the same local day.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select p from DailyPersonalPlan p
            where p.userId = :userId
              and p.localDate = :localDate
              and p.locale = :locale
              and p.status = com.mysticai.astrology.entity.DailyPersonalPlan$Status.ACTIVE
            """)
    Optional<DailyPersonalPlan> findActiveForUpdate(
            @Param("userId") Long userId,
            @Param("localDate") LocalDate localDate,
            @Param("locale") String locale);

    /** Idempotency: the plan already produced for a given feedback submission, if any. */
    Optional<DailyPersonalPlan> findByUserIdAndLocalDateAndLocaleAndRegenerationRequestKey(
            Long userId, LocalDate localDate, String locale, String regenerationRequestKey);

    /**
     * History window for duplicate suppression. Includes REPLACED rows on purpose: a suggestion
     * the user already saw must not come back just because the plan was later rebuilt.
     */
    @Query("""
            select p from DailyPersonalPlan p
            where p.userId = :userId
              and p.locale = :locale
              and p.localDate between :from and :to
              and p.status <> com.mysticai.astrology.entity.DailyPersonalPlan$Status.FAILED
            order by p.localDate desc
            """)
    List<DailyPersonalPlan> findHistory(
            @Param("userId") Long userId,
            @Param("locale") String locale,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /** Highest generation used for a local day, across ACTIVE and REPLACED rows. */
    @Query("""
            select coalesce(max(p.generationNumber), 0) from DailyPersonalPlan p
            where p.userId = :userId and p.localDate = :localDate and p.locale = :locale
            """)
    int findMaxGenerationNumber(
            @Param("userId") Long userId,
            @Param("localDate") LocalDate localDate,
            @Param("locale") String locale);

    /**
     * Retention cleanup. The cutoff is applied to {@code localDate}, and callers must keep it
     * older than the duplicate-suppression window so history stays usable.
     */
    @Modifying
    @Query("delete from DailyPersonalPlan p where p.localDate < :cutoff")
    int deleteOlderThan(@Param("cutoff") LocalDate cutoff);

    long countByCreatedAtBefore(LocalDateTime cutoff);
}
