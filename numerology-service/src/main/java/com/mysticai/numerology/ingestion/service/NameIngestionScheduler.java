package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.config.NameIngestionProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NameIngestionScheduler {

    private final NameIngestionProperties properties;
    private final NameIngestionService nameIngestionService;

    @Scheduled(cron = "${name-ingestion.schedule-cron:0 20 3 * * *}")
    public void runScheduledIngestion() {
        if (!properties.isEnabled()) {
            return;
        }

        try {
            nameIngestionService.runScheduledSources();
        } catch (Exception ex) {
            log.error("name ingestion scheduler failed: {}", ex.getMessage(), ex);
        }
    }
}
