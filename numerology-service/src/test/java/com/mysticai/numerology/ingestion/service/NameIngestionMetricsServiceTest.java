package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.entity.NameIngestionRun;
import com.mysticai.numerology.ingestion.model.IngestionRunStatus;
import com.mysticai.numerology.ingestion.model.IngestionTriggerType;
import com.mysticai.numerology.ingestion.model.SourceName;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class NameIngestionMetricsServiceTest {

    @Test
    void recordRun_publishesCountersGaugesAndDuration() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        NameIngestionMetricsService metricsService = new NameIngestionMetricsService(registry);

        NameIngestionRun run = NameIngestionRun.builder()
                .sourceName(SourceName.UFUK)
                .triggerType(IngestionTriggerType.SCHEDULED)
                .status(IngestionRunStatus.PARTIAL_SUCCESS)
                .discoveredCount(20)
                .fetchedCount(15)
                .parseSuccessCount(10)
                .parseFailureCount(2)
                .conflictCount(1)
                .mismatchCount(3)
                .duplicateCount(2)
                .lowQualityCount(4)
                .reviewBacklogCountSnapshot(6)
                .durationMs(1850L)
                .build();

        metricsService.recordRun(run);
        metricsService.setSourceEnabled(SourceName.UFUK, false);

        assertEquals(20.0, registry.get("ingestion_discovered_total").tag("source", "ufuk").counter().count());
        assertEquals(15.0, registry.get("ingestion_fetched_total").tag("source", "ufuk").counter().count());
        assertEquals(10.0, registry.get("ingestion_parse_success_total").tag("source", "ufuk").counter().count());
        assertEquals(2.0, registry.get("ingestion_parse_failure_total").tag("source", "ufuk").counter().count());
        assertEquals(3.0, registry.get("ingestion_mismatch_total").tag("source", "ufuk").counter().count());
        assertEquals(2.0, registry.get("ingestion_duplicate_total").tag("source", "ufuk").counter().count());
        assertEquals(4.0, registry.get("ingestion_low_quality_total").tag("source", "ufuk").counter().count());
        assertEquals(6.0, registry.get("ingestion_review_backlog_total").tag("source", "ufuk").gauge().value());
        assertEquals(0.0, registry.get("ingestion_source_enabled").tag("source", "ufuk").gauge().value());
        assertEquals(1L, registry.get("ingestion_run_duration_ms")
                .tag("source", "ufuk")
                .tag("status", "PARTIAL_SUCCESS")
                .summary()
                .count());
    }
}
