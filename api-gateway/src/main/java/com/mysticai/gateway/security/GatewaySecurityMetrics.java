package com.mysticai.gateway.security;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
public class GatewaySecurityMetrics {

    private final Counter headerSpoofAttempts;
    private final Counter missingAuthAttempts;
    private final Counter invalidAuthAttempts;
    private final Counter corsBlockedPreflightAttempts;

    public GatewaySecurityMetrics(MeterRegistry meterRegistry) {
        this.headerSpoofAttempts = Counter.builder("security.gateway.header_spoof_attempts")
                .description("Spoofed downstream user context headers detected at API gateway.")
                .register(meterRegistry);
        this.missingAuthAttempts = Counter.builder("security.gateway.missing_auth_attempts")
                .description("Requests rejected at gateway due to missing auth.")
                .register(meterRegistry);
        this.invalidAuthAttempts = Counter.builder("security.gateway.invalid_auth_attempts")
                .description("Requests rejected at gateway due to invalid/expired JWT.")
                .register(meterRegistry);
        this.corsBlockedPreflightAttempts = Counter.builder("security.gateway.cors_blocked_preflight_attempts")
                .description("CORS preflight requests rejected by origin allowlist.")
                .register(meterRegistry);
    }

    public void incrementHeaderSpoofAttempts() {
        headerSpoofAttempts.increment();
    }

    public void incrementMissingAuthAttempts() {
        missingAuthAttempts.increment();
    }

    public void incrementInvalidAuthAttempts() {
        invalidAuthAttempts.increment();
    }

    public void incrementCorsBlockedPreflightAttempts() {
        corsBlockedPreflightAttempts.increment();
    }
}
