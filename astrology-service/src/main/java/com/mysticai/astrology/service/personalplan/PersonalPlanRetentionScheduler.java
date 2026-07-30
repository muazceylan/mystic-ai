package com.mysticai.astrology.service.personalplan;

import com.mysticai.astrology.config.PersonalPlanProperties;
import com.mysticai.astrology.repository.DailyPersonalPlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Keeps {@code daily_personal_plans} from growing without bound.
 *
 * The cutoff is clamped so it can never reach into the duplicate-suppression window: even if
 * {@code retentionDays} were misconfigured below {@code historyDays}, the job keeps at least
 * the history window plus a day of margin, so cleanup can never cause a recently-shown
 * suggestion to reappear.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PersonalPlanRetentionScheduler {

    private final DailyPersonalPlanRepository planRepository;
    private final PersonalPlanProperties properties;

    /** Nightly at 03:20, alongside the other cleanup jobs. */
    @Scheduled(cron = "${personal-plan.retention-cron:0 20 3 * * *}")
    @Transactional
    public void purgeExpiredPlans() {
        int cutoffDays = effectiveRetentionDays();
        LocalDate cutoff = LocalDate.now().minusDays(cutoffDays);

        int deleted = planRepository.deleteOlderThan(cutoff);
        if (deleted > 0) {
            log.info("Personal plan retention: removed {} plans older than {} ({} days).",
                    deleted, cutoff, cutoffDays);
        }
    }

    /** Never prune inside the history window the composer relies on. */
    int effectiveRetentionDays() {
        int minimum = Math.max(1, properties.getHistoryDays()) + 1;
        return Math.max(minimum, properties.getRetentionDays());
    }
}
