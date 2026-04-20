package com.mysticai.auth.service;

import com.mysticai.auth.config.properties.SignupBonusSyncProperties;
import com.mysticai.auth.entity.User;
import com.mysticai.auth.entity.enums.SignupBonusSyncStatus;
import com.mysticai.auth.repository.UserRepository;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class SignupBonusSyncService {

    private static final int MAX_ERROR_LENGTH = 512;

    private final UserRepository userRepository;
    private final MonetizationSignupBonusClient monetizationSignupBonusClient;
    private final SignupBonusSyncProperties properties;
    private final Clock clock;
    private final MeterRegistry meterRegistry;
    private final ObjectProvider<SignupBonusSyncService> selfProvider;

    public void scheduleSignupBonus(User user, String registrationSource) {
        if (user == null || user.getId() == null) {
            return;
        }

        SignupBonusSyncStatus currentStatus = user.getSignupBonusSyncStatus();
        if (currentStatus == SignupBonusSyncStatus.GRANTED || currentStatus == SignupBonusSyncStatus.SKIPPED) {
            return;
        }

        LocalDateTime now = LocalDateTime.now(clock);
        user.setSignupBonusSyncStatus(SignupBonusSyncStatus.PENDING);
        user.setSignupBonusRegistrationSource(normalizeSource(registrationSource));
        user.setSignupBonusLastError(null);
        if (user.getSignupBonusNextRetryAt() == null || user.getSignupBonusNextRetryAt().isAfter(now)) {
            user.setSignupBonusNextRetryAt(now);
        }

        if (TransactionSynchronizationManager.isSynchronizationActive()
                && TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    selfProvider.getObject().attemptSignupBonusSync(user.getId(), "after_commit");
                }
            });
            return;
        }

        selfProvider.getObject().attemptSignupBonusSync(user.getId(), "direct");
    }

    @Transactional(readOnly = true)
    public List<Long> findRetryCandidateIds() {
        return userRepository.findSignupBonusRetryCandidateIds(
                SignupBonusSyncStatus.PENDING,
                LocalDateTime.now(clock),
                PageRequest.of(0, properties.batchSize())
        );
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public SyncAttemptResult attemptSignupBonusSync(Long userId, String trigger) {
        if (userId == null) {
            return SyncAttemptResult.skipped("missing_user_id");
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("Signup bonus sync skipped: user missing, userId={}, trigger={}", userId, trigger);
            incrementMetric("signup_bonus.sync.skipped", "reason", "user_missing", "trigger", trigger);
            return SyncAttemptResult.skipped("user_missing");
        }

        if (user.getSignupBonusSyncStatus() == SignupBonusSyncStatus.GRANTED || user.getSignupBonusGrantedAt() != null) {
            incrementMetric("signup_bonus.sync.duplicate", "reason", "already_granted", "trigger", trigger);
            return SyncAttemptResult.skipped("already_granted");
        }

        if (user.getSignupBonusSyncStatus() == SignupBonusSyncStatus.SKIPPED) {
            incrementMetric("signup_bonus.sync.skipped", "reason", "already_skipped", "trigger", trigger);
            return SyncAttemptResult.skipped("already_skipped");
        }

        if (isBlank(user.getSignupBonusRegistrationSource())) {
            incrementMetric("signup_bonus.sync.skipped", "reason", "missing_registration_source", "trigger", trigger);
            return SyncAttemptResult.skipped("missing_registration_source");
        }

        LocalDateTime now = LocalDateTime.now(clock);
        if (user.getSignupBonusNextRetryAt() != null && user.getSignupBonusNextRetryAt().isAfter(now)) {
            incrementMetric("signup_bonus.sync.skipped", "reason", "retry_not_due", "trigger", trigger);
            return SyncAttemptResult.skipped("retry_not_due");
        }

        user.setSignupBonusSyncStatus(SignupBonusSyncStatus.PENDING);
        user.setSignupBonusRetryCount(Math.max(0, user.getSignupBonusRetryCount()) + 1);
        user.setSignupBonusLastAttemptAt(now);

        try {
            MonetizationSignupBonusClient.SignupBonusResponse response = monetizationSignupBonusClient.grantSignupBonus(
                    user.getId(),
                    user.getSignupBonusRegistrationSource(),
                    normalizeLocale(user.getPreferredLanguage())
            );

            if (response != null && isTerminalSkip(response.status())) {
                user.setSignupBonusSyncStatus(SignupBonusSyncStatus.SKIPPED);
                user.setSignupBonusNextRetryAt(null);
                user.setSignupBonusLastError(null);
                log.info("Signup bonus sync skipped: userId={}, trigger={}, status={}, registrationSource={}",
                        user.getId(), trigger, response.status(), user.getSignupBonusRegistrationSource());
                incrementMetric("signup_bonus.sync.skipped", "reason", safeStatus(response.status()), "trigger", trigger);
                return SyncAttemptResult.skipped(response.status());
            }

            user.setSignupBonusSyncStatus(SignupBonusSyncStatus.GRANTED);
            user.setSignupBonusGrantedAt(now);
            user.setSignupBonusNextRetryAt(null);
            user.setSignupBonusLastError(null);
            log.info("Signup bonus sync granted: userId={}, trigger={}, attemptCount={}, registrationSource={}",
                    user.getId(), trigger, user.getSignupBonusRetryCount(), user.getSignupBonusRegistrationSource());
            incrementMetric("signup_bonus.sync.granted", "trigger", trigger);
            return SyncAttemptResult.granted();
        } catch (Exception e) {
            user.setSignupBonusSyncStatus(SignupBonusSyncStatus.PENDING);
            user.setSignupBonusLastError(truncateError(e.getMessage()));
            user.setSignupBonusNextRetryAt(now.plus(properties.retryDelay()));
            log.warn("Signup bonus sync failed: userId={}, trigger={}, retryCount={}, nextRetryAt={}, error={}",
                    user.getId(),
                    trigger,
                    user.getSignupBonusRetryCount(),
                    user.getSignupBonusNextRetryAt(),
                    e.getMessage());
            incrementMetric("signup_bonus.sync.failed", "trigger", trigger);
            incrementMetric("signup_bonus.sync.retry_scheduled", "trigger", trigger);
            return SyncAttemptResult.retryScheduled(user.getSignupBonusNextRetryAt());
        }
    }

    private boolean isTerminalSkip(String status) {
        return "signup_bonus_disabled".equalsIgnoreCase(status)
                || "registration_source_filtered".equalsIgnoreCase(status)
                || "signup_bonus_amount_zero".equalsIgnoreCase(status);
    }

    private String safeStatus(String status) {
        return status == null || status.isBlank()
                ? "unknown"
                : status.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeSource(String registrationSource) {
        if (registrationSource == null || registrationSource.isBlank()) {
            return null;
        }
        return registrationSource.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeLocale(String locale) {
        if (locale == null || locale.isBlank()) {
            return "tr";
        }
        return locale.trim();
    }

    private String truncateError(String error) {
        if (error == null || error.isBlank()) {
            return "signup_bonus_sync_failed";
        }
        String normalized = error.trim();
        return normalized.length() <= MAX_ERROR_LENGTH
                ? normalized
                : normalized.substring(0, MAX_ERROR_LENGTH);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private void incrementMetric(String name, String... tags) {
        meterRegistry.counter("auth." + name, tags).increment();
    }

    public record SyncAttemptResult(String status, LocalDateTime nextRetryAt) {
        static SyncAttemptResult granted() {
            return new SyncAttemptResult("granted", null);
        }

        static SyncAttemptResult skipped(String status) {
            return new SyncAttemptResult(status, null);
        }

        static SyncAttemptResult retryScheduled(LocalDateTime nextRetryAt) {
            return new SyncAttemptResult("retry_scheduled", nextRetryAt);
        }
    }
}
