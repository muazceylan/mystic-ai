package com.mysticai.auth.config.properties;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class SignupBonusSyncProperties {

    private final Duration retryDelay;
    private final Duration schedulerInitialDelay;
    private final Duration schedulerFixedDelay;
    private final int batchSize;

    public SignupBonusSyncProperties(
            @Value("${auth.signup-bonus.retry.delay-seconds:60}") long retryDelaySeconds,
            @Value("${auth.signup-bonus.scheduler.initial-delay-seconds:90}") long schedulerInitialDelaySeconds,
            @Value("${auth.signup-bonus.scheduler.fixed-delay-seconds:120}") long schedulerFixedDelaySeconds,
            @Value("${auth.signup-bonus.scheduler.batch-size:100}") int batchSize
    ) {
        this.retryDelay = Duration.ofSeconds(Math.max(15, retryDelaySeconds));
        this.schedulerInitialDelay = Duration.ofSeconds(Math.max(15, schedulerInitialDelaySeconds));
        this.schedulerFixedDelay = Duration.ofSeconds(Math.max(15, schedulerFixedDelaySeconds));
        this.batchSize = Math.max(1, Math.min(500, batchSize));
    }

    public Duration retryDelay() {
        return retryDelay;
    }

    public Duration schedulerInitialDelay() {
        return schedulerInitialDelay;
    }

    public Duration schedulerFixedDelay() {
        return schedulerFixedDelay;
    }

    public int batchSize() {
        return batchSize;
    }
}
