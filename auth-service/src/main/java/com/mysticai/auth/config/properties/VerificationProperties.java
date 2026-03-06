package com.mysticai.auth.config.properties;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class VerificationProperties {

    private final String tokenPepper;
    private final int tokenBytes;
    private final Duration tokenTtl;
    private final Duration resendCooldown;
    private final int resendDailyLimit;
    private final int maxRetryCount;
    private final Duration retryDelay;

    public VerificationProperties(
            @Value("${auth.verification.token-pepper:change-me-dev-pepper}") String tokenPepper,
            @Value("${auth.verification.token-bytes:48}") int tokenBytes,
            @Value("${auth.verification.token-ttl-hours:24}") long tokenTtlHours,
            @Value("${auth.verification.resend-cooldown-seconds:60}") long resendCooldownSeconds,
            @Value("${auth.verification.resend-daily-limit:5}") int resendDailyLimit,
            @Value("${auth.verification.retry.max-attempts:3}") int maxRetryCount,
            @Value("${auth.verification.retry.delay-seconds:30}") long retryDelaySeconds
    ) {
        this.tokenPepper = tokenPepper;
        this.tokenBytes = Math.max(32, Math.min(64, tokenBytes));
        this.tokenTtl = Duration.ofHours(Math.max(1, tokenTtlHours));
        this.resendCooldown = Duration.ofSeconds(Math.max(1, resendCooldownSeconds));
        this.resendDailyLimit = Math.max(1, resendDailyLimit);
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

    public Duration resendCooldown() {
        return resendCooldown;
    }

    public int resendDailyLimit() {
        return resendDailyLimit;
    }

    public int maxRetryCount() {
        return maxRetryCount;
    }

    public Duration retryDelay() {
        return retryDelay;
    }
}
