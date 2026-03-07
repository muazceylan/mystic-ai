package com.mysticai.orchestrator.service;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ProviderStateManager {

    private static final EnumSet<AiFailureType> COOLDOWN_FAILURE_TYPES = EnumSet.of(
            AiFailureType.RATE_LIMIT,
            AiFailureType.CONNECTION_ERROR,
            AiFailureType.MODEL_NOT_FOUND,
            AiFailureType.MODEL_DECOMMISSIONED,
            AiFailureType.AUTH_ERROR,
            AiFailureType.BAD_REQUEST,
            AiFailureType.EMPTY_RESPONSE
    );

    private final ConcurrentHashMap<String, ProviderRuntimeState> states = new ConcurrentHashMap<>();

    public ProviderRuntimeState stateOf(String providerKey) {
        return states.computeIfAbsent(providerKey, ignored -> new ProviderRuntimeState());
    }

    public boolean isCooldownActive(String providerKey) {
        ProviderRuntimeState state = stateOf(providerKey);
        Instant disabledUntil = state.getDisabledUntil();
        return disabledUntil != null && Instant.now().isBefore(disabledUntil);
    }

    public long remainingCooldownSeconds(String providerKey) {
        ProviderRuntimeState state = stateOf(providerKey);
        Instant disabledUntil = state.getDisabledUntil();
        if (disabledUntil == null) {
            return 0;
        }
        long seconds = Duration.between(Instant.now(), disabledUntil).getSeconds();
        return Math.max(seconds, 0);
    }

    public void markSuccess(String providerKey) {
        ProviderRuntimeState state = stateOf(providerKey);
        synchronized (state) {
            state.setConsecutiveFailures(0);
            state.setLastFailureReason(null);
            state.setLastFailureAt(null);
            state.setDisabledUntil(null);
        }
    }

    public void markFailure(String providerKey, AiFailureType failureType, int cooldownSeconds, String reason) {
        ProviderRuntimeState state = stateOf(providerKey);
        synchronized (state) {
            state.setConsecutiveFailures(state.getConsecutiveFailures() + 1);
            state.setLastFailureReason(reason);
            state.setLastFailureAt(Instant.now());
            if (COOLDOWN_FAILURE_TYPES.contains(failureType) && cooldownSeconds > 0) {
                state.setDisabledUntil(Instant.now().plusSeconds(cooldownSeconds));
            }
        }
    }
}
