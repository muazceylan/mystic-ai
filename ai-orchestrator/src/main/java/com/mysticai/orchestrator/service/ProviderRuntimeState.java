package com.mysticai.orchestrator.service;

import java.time.Instant;

public class ProviderRuntimeState {

    private volatile Instant disabledUntil;
    private volatile String lastFailureReason;
    private volatile Instant lastFailureAt;
    private volatile int consecutiveFailures;

    public Instant getDisabledUntil() {
        return disabledUntil;
    }

    public void setDisabledUntil(Instant disabledUntil) {
        this.disabledUntil = disabledUntil;
    }

    public String getLastFailureReason() {
        return lastFailureReason;
    }

    public void setLastFailureReason(String lastFailureReason) {
        this.lastFailureReason = lastFailureReason;
    }

    public Instant getLastFailureAt() {
        return lastFailureAt;
    }

    public void setLastFailureAt(Instant lastFailureAt) {
        this.lastFailureAt = lastFailureAt;
    }

    public int getConsecutiveFailures() {
        return consecutiveFailures;
    }

    public void setConsecutiveFailures(int consecutiveFailures) {
        this.consecutiveFailures = consecutiveFailures;
    }
}
