package com.mysticai.notification.service.monetization;

import com.mysticai.notification.entity.monetization.GuruLedger;
import com.mysticai.notification.entity.monetization.MonetizationSettings;
import com.mysticai.notification.repository.GuruLedgerRepository;
import com.mysticai.notification.repository.GuruWalletRepository;
import com.mysticai.notification.repository.MonetizationSettingsRepository;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class SignupBonusService {

    private final MonetizationSettingsRepository settingsRepository;
    private final GuruWalletRepository walletRepository;
    private final GuruLedgerRepository ledgerRepository;
    private final GuruWalletService guruWalletService;
    private final MeterRegistry meterRegistry;

    @Transactional
    public SignupBonusResult grantSignupBonus(Long userId,
                                              String registrationSource,
                                              String platform,
                                              String locale) {
        MonetizationSettings settings = settingsRepository
                .findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED)
                .orElse(null);

        if (settings == null || !settings.isEnabled() || !settings.isSignupBonusEnabled()) {
            return SignupBonusResult.skipped(userId, registrationSource, "signup_bonus_disabled");
        }

        String normalizedSource = normalize(registrationSource);
        String configuredSource = normalize(settings.getSignupBonusRegistrationSource());
        if (configuredSource != null && !configuredSource.equals(normalizedSource)) {
            return SignupBonusResult.skipped(userId, registrationSource, "registration_source_filtered");
        }

        int amount = Math.max(0, settings.getSignupBonusTokenAmount());
        if (amount <= 0) {
            return SignupBonusResult.skipped(userId, registrationSource, "signup_bonus_amount_zero");
        }

        String ledgerReason = normalizeLedgerReason(settings.getSignupBonusLedgerReason());
        String idempotencyKey = settings.isSignupBonusOneTimeOnly()
                ? "signup_bonus:" + userId
                : "signup_bonus:" + userId + ":" + (normalizedSource != null ? normalizedSource : "DEFAULT");
        boolean alreadyGranted = ledgerRepository.existsByIdempotencyKey(idempotencyKey);
        String metadataJson = buildMetadataJson(registrationSource, ledgerReason);

        GuruLedger ledger = guruWalletService.grantGuru(
                userId,
                amount,
                GuruLedger.TransactionType.WELCOME_BONUS,
                GuruLedger.SourceType.SYSTEM,
                ledgerReason,
                "auth",
                "signup_bonus",
                platform,
                locale,
                idempotencyKey,
                metadataJson
        );

        boolean grantedNow = !alreadyGranted
                && ledger != null
                && GuruLedger.TransactionType.WELCOME_BONUS.equals(ledger.getTransactionType())
                && idempotencyKey.equals(ledger.getIdempotencyKey());
        int balance = walletRepository.findByUserId(userId)
                .map(w -> w.getCurrentBalance())
                .orElse(0);

        if (grantedNow) {
            log.info("Signup bonus processed: userId={}, amount={}, registrationSource={}, balance={}",
                    userId, amount, registrationSource, balance);
            incrementMetric("signup_bonus.granted", "result", "granted");
        } else if (alreadyGranted) {
            log.info("Signup bonus duplicate idempotency hit: userId={}, registrationSource={}", userId, registrationSource);
            incrementMetric("idempotency.hit", "operation", "signup_bonus", "result", "already_granted");
        }

        return new SignupBonusResult(
                grantedNow,
                true,
                amount,
                balance,
                grantedNow ? "signup_bonus_granted" : "signup_bonus_already_granted",
                ledgerReason,
                registrationSource
        );
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeLedgerReason(String value) {
        if (value == null || value.isBlank()) {
            return "SIGNUP_BONUS";
        }
        return value.trim();
    }

    private String buildMetadataJson(String registrationSource, String ledgerReason) {
        String safeSource = registrationSource == null ? "" : registrationSource.replace("\"", "'");
        String safeReason = ledgerReason.replace("\"", "'");
        return "{\"registrationSource\":\"" + safeSource + "\",\"ledgerReason\":\"" + safeReason + "\"}";
    }

    private void incrementMetric(String name, String... tags) {
        meterRegistry.counter("notification.monetization." + name, tags).increment();
    }

    public record SignupBonusResult(
            boolean granted,
            boolean enabled,
            int amountGranted,
            int currentBalance,
            String status,
            String ledgerReason,
            String registrationSource
    ) {
        public static SignupBonusResult skipped(Long userId, String registrationSource, String status) {
            return new SignupBonusResult(false, false, 0, 0, status, "SIGNUP_BONUS", registrationSource);
        }
    }
}
