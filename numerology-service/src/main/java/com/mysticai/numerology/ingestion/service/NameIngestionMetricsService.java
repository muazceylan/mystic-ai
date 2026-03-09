package com.mysticai.numerology.ingestion.service;

import com.mysticai.numerology.ingestion.entity.NameIngestionRun;
import com.mysticai.numerology.ingestion.model.SourceName;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class NameIngestionMetricsService {

    private final MeterRegistry meterRegistry;

    private final Map<String, Counter> counters = new ConcurrentHashMap<>();
    private final Map<String, DistributionSummary> durationSummaries = new ConcurrentHashMap<>();
    private final Map<String, AtomicInteger> backlogGauges = new ConcurrentHashMap<>();
    private final Map<String, AtomicInteger> enabledGauges = new ConcurrentHashMap<>();

    public void recordRun(NameIngestionRun run) {
        String sourceTag = run.getSourceName().getConfigKey();
        counter("ingestion_discovered_total", sourceTag).increment(run.getDiscoveredCount());
        counter("ingestion_fetched_total", sourceTag).increment(run.getFetchedCount());
        counter("ingestion_parse_success_total", sourceTag).increment(run.getParseSuccessCount());
        counter("ingestion_parse_failure_total", sourceTag).increment(run.getParseFailureCount());
        counter("ingestion_conflict_total", sourceTag).increment(run.getConflictCount());
        counter("ingestion_mismatch_total", sourceTag).increment(run.getMismatchCount());
        counter("ingestion_duplicate_total", sourceTag).increment(run.getDuplicateCount());
        counter("ingestion_low_quality_total", sourceTag).increment(run.getLowQualityCount());

        setBacklogGauge(run.getSourceName(), run.getReviewBacklogCountSnapshot());
        recordDuration(run);
    }

    public void setSourceEnabled(SourceName sourceName, boolean enabled) {
        AtomicInteger gaugeRef = enabledGauges.computeIfAbsent(sourceName.getConfigKey(), key -> {
            AtomicInteger ref = new AtomicInteger(0);
            Gauge.builder("ingestion_source_enabled", ref, AtomicInteger::get)
                    .tag("source", key)
                    .register(meterRegistry);
            return ref;
        });
        gaugeRef.set(enabled ? 1 : 0);
    }

    private void setBacklogGauge(SourceName sourceName, int backlogCount) {
        AtomicInteger gaugeRef = backlogGauges.computeIfAbsent(sourceName.getConfigKey(), key -> {
            AtomicInteger ref = new AtomicInteger(0);
            Gauge.builder("ingestion_review_backlog_total", ref, AtomicInteger::get)
                    .tag("source", key)
                    .register(meterRegistry);
            return ref;
        });
        gaugeRef.set(Math.max(backlogCount, 0));
    }

    private void recordDuration(NameIngestionRun run) {
        if (run.getDurationMs() == null || run.getDurationMs() < 0) {
            return;
        }
        String key = run.getSourceName().getConfigKey() + "|" + run.getStatus().name();
        DistributionSummary summary = durationSummaries.computeIfAbsent(key, ignored -> DistributionSummary
                .builder("ingestion_run_duration_ms")
                .baseUnit("milliseconds")
                .tag("source", run.getSourceName().getConfigKey())
                .tag("status", run.getStatus().name())
                .register(meterRegistry));

        summary.record(run.getDurationMs());
    }

    private Counter counter(String name, String sourceTag) {
        String key = name + "|" + sourceTag;
        return counters.computeIfAbsent(key, ignored -> Counter.builder(name)
                .tag("source", sourceTag)
                .register(meterRegistry));
    }
}
