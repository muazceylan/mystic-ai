package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.PlannerReminder;
import com.mysticai.astrology.entity.ReminderStatus;
import com.mysticai.astrology.entity.ReminderType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PlannerReminderRepository extends JpaRepository<PlannerReminder, Long> {

    List<PlannerReminder> findByUserIdAndReminderDateBetweenOrderByDateTimeUtcAsc(
            Long userId,
            LocalDate from,
            LocalDate to
    );

    Optional<PlannerReminder> findByUserIdAndTypeAndPayloadHashAndDateTimeUtc(
            Long userId,
            ReminderType type,
            String payloadHash,
            LocalDateTime dateTimeUtc
    );

    Optional<PlannerReminder> findByIdAndUserId(Long id, Long userId);

    List<PlannerReminder> findTop200ByStatusAndEnabledTrueAndNextAttemptUtcLessThanEqualOrderByNextAttemptUtcAsc(
            ReminderStatus status,
            LocalDateTime dueAt
    );
}
