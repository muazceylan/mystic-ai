package com.mysticai.notification.scheduler;

import com.mysticai.notification.admin.service.cms.HoroscopeIngestService;
import com.mysticai.notification.entity.cms.IngestLog;
import com.mysticai.notification.entity.cms.WeeklyHoroscopeCms;
import com.mysticai.notification.repository.DailyHoroscopeCmsRepository;
import com.mysticai.notification.repository.IngestLogRepository;
import com.mysticai.notification.repository.WeeklyHoroscopeCmsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

/**
 * Automatically ingests daily and weekly horoscopes from astrology-service.
 * - On startup: runs immediately if today's/this-week's data is missing
 * - Daily: every day at 00:00 for all 12 signs × configured locales
 * - Weekly: every Monday at 00:00 for all 12 signs × configured locales
 * Uses IngestLog to avoid duplicate runs within the same day/week.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class HoroscopeIngestScheduler {

    private final HoroscopeIngestService ingestService;
    private final IngestLogRepository ingestLogRepository;
    private final DailyHoroscopeCmsRepository dailyRepo;
    private final WeeklyHoroscopeCmsRepository weeklyRepo;

    private static final List<String> LOCALES = List.of("tr", "en");
    private static final WeeklyHoroscopeCms.ZodiacSign[] SIGNS = WeeklyHoroscopeCms.ZodiacSign.values();

    /**
     * On startup: checks each sign×locale individually and ingests missing or incomplete records.
     * A record is re-ingested if: it doesn't exist, has an ingestError, OR its fullContent is
     * truncated (does not end with a sentence terminator — indicates an AI token-limit cut-off).
     * The ingest service itself enforces the final skip/re-ingest decision based on content completeness.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void ingestOnStartup() {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        log.info("[Scheduler] Startup check — scanning for missing or truncated horoscopes (daily={}, weekStart={})", today, weekStart);

        for (String locale : LOCALES) {
            for (WeeklyHoroscopeCms.ZodiacSign sign : SIGNS) {
                // Daily: ingest if missing, errored, or content is incomplete
                boolean dailyNeedsIngest = !dailyRepo.existsByZodiacSignAndDateAndLocaleAndIngestErrorIsNull(sign, today, locale)
                        || isDailyContentIncomplete(sign, today, locale);
                if (dailyNeedsIngest) {
                    log.info("[Startup] Daily {} {} {} needs ingest (missing or truncated)", sign, today, locale);
                    try {
                        ingestService.ingestDaily(sign, today, locale);
                    } catch (Exception e) {
                        log.warn("[Startup] Failed daily {} {} {}: {}", sign, today, locale, e.getMessage());
                    }
                }
                // Weekly: ingest if missing, errored, or content is incomplete
                boolean weeklyNeedsIngest = !weeklyRepo.existsByZodiacSignAndWeekStartDateAndLocaleAndIngestErrorIsNull(sign, weekStart, locale)
                        || isWeeklyContentIncomplete(sign, weekStart, locale);
                if (weeklyNeedsIngest) {
                    log.info("[Startup] Weekly {} {} {} needs ingest (missing or truncated)", sign, weekStart, locale);
                    try {
                        ingestService.ingestWeekly(sign, weekStart, locale);
                    } catch (Exception e) {
                        log.warn("[Startup] Failed weekly {} {} {}: {}", sign, weekStart, locale, e.getMessage());
                    }
                }
            }
        }
        log.info("[Scheduler] Startup check complete");
    }

    private boolean isDailyContentIncomplete(WeeklyHoroscopeCms.ZodiacSign sign, LocalDate date, String locale) {
        return dailyRepo.findByZodiacSignAndDateAndLocale(sign, date, locale)
                .map(r -> !isContentComplete(r.getFullContent()))
                .orElse(false);
    }

    private boolean isWeeklyContentIncomplete(WeeklyHoroscopeCms.ZodiacSign sign, LocalDate weekStart, String locale) {
        return weeklyRepo.findByZodiacSignAndWeekStartDateAndLocale(sign, weekStart, locale)
                .map(r -> !isContentComplete(r.getFullContent()))
                .orElse(false);
    }

    private boolean isContentComplete(String content) {
        if (content == null || content.isBlank()) return false;
        String trimmed = content.trim();
        if (trimmed.length() < 50) return false;
        char last = trimmed.charAt(trimmed.length() - 1);
        return last == '.' || last == '!' || last == '?' || last == '…';
    }

    /**
     * Runs every day at midnight. Ingests any sign that is still missing for today.
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void scheduledDailyIngest() {
        LocalDate today = LocalDate.now();
        log.info("[Scheduler] Daily ingest run for {}", today);
        int success = 0, failure = 0;

        for (String locale : LOCALES) {
            for (WeeklyHoroscopeCms.ZodiacSign sign : SIGNS) {
                if (dailyRepo.existsByZodiacSignAndDateAndLocaleAndIngestErrorIsNull(sign, today, locale)) continue;
                try {
                    ingestService.ingestDaily(sign, today, locale);
                    success++;
                } catch (Exception e) {
                    log.warn("[Scheduler] Daily failed {} {} {}: {}", sign, today, locale, e.getMessage());
                    failure++;
                }
            }
        }

        updateIngestLog(IngestLog.IngestType.DAILY_HOROSCOPE, today, success, failure);
        log.info("[Scheduler] Daily ingest done: success={}, failure={}", success, failure);
    }

    /**
     * Runs every Monday at midnight. Ingests any sign that is still missing for this week.
     */
    @Scheduled(cron = "0 0 0 * * MON")
    public void scheduledWeeklyIngest() {
        LocalDate weekStart = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        log.info("[Scheduler] Weekly ingest run for week starting {}", weekStart);
        int success = 0, failure = 0;

        for (String locale : LOCALES) {
            for (WeeklyHoroscopeCms.ZodiacSign sign : SIGNS) {
                if (weeklyRepo.existsByZodiacSignAndWeekStartDateAndLocaleAndIngestErrorIsNull(sign, weekStart, locale)) continue;
                try {
                    ingestService.ingestWeekly(sign, weekStart, locale);
                    success++;
                } catch (Exception e) {
                    log.warn("[Scheduler] Weekly failed {} {} {}: {}", sign, weekStart, locale, e.getMessage());
                    failure++;
                }
            }
        }

        updateIngestLog(IngestLog.IngestType.WEEKLY_HOROSCOPE, weekStart, success, failure);
        log.info("[Scheduler] Weekly ingest done: success={}, failure={}", success, failure);
    }

    /** Updates IngestLog for all configured locales (summary record per type+locale). */
    private void updateIngestLog(IngestLog.IngestType type, LocalDate date, int success, int failure) {
        for (String locale : LOCALES) {
            IngestLog entry = ingestLogRepository
                    .findByIngestTypeAndLocale(type, locale)
                    .orElseGet(() -> IngestLog.builder().ingestType(type).locale(locale).build());
            entry.setLastIngestDate(date);
            entry.setLastIngestAt(LocalDateTime.now());
            entry.setSuccessCount(success);
            entry.setFailureCount(failure);
            ingestLogRepository.save(entry);
        }
    }
}
