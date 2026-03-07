package com.mysticai.auth.config.properties;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class PasswordResetProperties {

    private final String tokenPepper;
    private final int tokenBytes;
    private final Duration tokenTtl;
    private final Duration requestCooldown;
    private final int requestDailyLimit;
    private final int maxRetryCount;
    private final Duration retryDelay;

    public PasswordResetProperties(
            @Value("${auth.password-reset.token-pepper:change-me-password-reset-pepper}") String tokenPepper,
            @Value("${auth.password-reset.token-bytes:48}") int tokenBytes,
            @Value("${auth.password-reset.token-ttl-minutes:30}") long tokenTtlMinutes,
            @Value("${auth.password-reset.request-cooldown-seconds:60}") long requestCooldownSeconds,
            @Value("${auth.password-reset.request-daily-limit:5}") int requestDailyLimit,
            @Value("${auth.password-reset.retry.max-attempts:3}") int maxRetryCount,
            @Value("${auth.password-reset.retry.delay-seconds:30}") long retryDelaySeconds
    ) {
        this.tokenPepper = tokenPepper;
        this.tokenBytes = Math.max(32, Math.min(64, tokenBytes));
        this.tokenTtl = Duration.ofMinutes(Math.max(5, tokenTtlMinutes));
        this.requestCooldown = Duration.ofSeconds(Math.max(1, requestCooldownSeconds));
        this.requestDailyLimit = Math.max(1, requestDailyLimit);
        this.maxRetryCount = Math.max(1, maxRetryCount);
        this.retryDelay = Duration.ofSeconds(Math.max(1, retryDelaySeconds));
    }

    public String tokenPepper() {
        return tokenPepper;
    }

    public int tokenBytes() {
        return tokenBytes;
    }

    public Duration tokenTtl() {
        return tokenTtl;
    }

    public Duration requestCooldown() {
        return requestCooldown;
    }

    public int requestDailyLimit() {
        return requestDailyLimit;
    }

    public int maxRetryCount() {
        return maxRetryCount;
    }

    public Duration retryDelay() {
        return retryDelay;
    }
}
