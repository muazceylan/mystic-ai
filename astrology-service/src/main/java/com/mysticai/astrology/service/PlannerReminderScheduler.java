package com.mysticai.astrology.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PlannerReminderScheduler {

    private final PlannerReminderService plannerReminderService;

    @Scheduled(cron = "0 * * * * *")
    public void runReminderDispatch() {
        try {
            int sent = plannerReminderService.dispatchDueReminders();
            if (sent > 0) {
                log.info("planner reminder scheduler sent {} notification(s)", sent);
            }
        } catch (Exception ex) {
            log.error("planner reminder scheduler failed: {}", ex.getMessage(), ex);
        }
    }
}
