package com.mysticai.notification.service.rewarded;

import com.mysticai.notification.entity.monetization.RewardIntent;
import com.mysticai.notification.entity.monetization.RewardIntentStatus;
import com.mysticai.notification.repository.RewardIntentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * Stateless validation rules for reward intent operations.
 * All checks throw IllegalStateException with a descriptive code so the
 * controller can map them to the correct HTTP status.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RewardedAdValidationService {

    private final RewardIntentRepository intentRepository;

    @Value("${rewarded-ads.daily-limit:10}")
    private int dailyLimit;

    @Value("${rewarded-ads.hourly-limit:3}")
    private int hourlyLimit;

    @Value("${rewarded-ads.max-parallel-pending-intents:1}")
    private int maxParallelPendingIntents;

    @Value("${rewarded-ads.cooldown-seconds:60}")
    private int cooldownSeconds;

    /** Validates that a new intent can be created for the given user. */
    public void validateCanCreateIntent(Long userId) {
        // Check enabled state is done at service level.

        long activeCount = intentRepository.countActiveIntents(userId, LocalDateTime.now());
        if (activeCount >= maxParallelPendingIntents) {
            log.warn("Intent creation blocked: too many active intents userId={} count={}", userId, activeCount);
            throw new RewardValidationException("TOO_MANY_ACTIVE_INTENTS",
                "Zaten aktif bir reklam seansı var. Lütfen tamamlanmasını bekleyin.");
        }

        long todayCount = intentRepository.countClaimedToday(userId, todayMidnightUtc());
        if (todayCount >= dailyLimit) {
            log.info("Daily cap reached: userId={} todayCount={}", userId, todayCount);
            throw new RewardValidationException("DAILY_CAP_REACHED",
                "Günlük Guru Token kazanım limitine ulaştınız. Yarın tekrar deneyin.");
        }

        long lastHourCount = intentRepository.countClaimedSince(userId, LocalDateTime.now().minusSeconds(3600));
        if (lastHourCount >= hourlyLimit) {
            log.info("Hourly cap reached: userId={} lastHourCount={}", userId, lastHourCount);
            throw new RewardValidationException("HOURLY_CAP_REACHED",
                "Saatlik kazanım limitine ulaştınız. Daha sonra tekrar deneyin.");
        }

        // Cooldown: last claim was too recent?
        long recentClaims = intentRepository.countClaimedSince(userId,
            LocalDateTime.now().minusSeconds(cooldownSeconds));
        if (recentClaims > 0) {
            log.info("Cooldown active: userId={}", userId);
            throw new RewardValidationException("COOLDOWN_ACTIVE",
                "Son reklamdan bu yana bekleme süresi dolmadı. Lütfen " + cooldownSeconds + " saniye bekleyin.");
        }
    }

    /** Validates that claim can proceed for the given intent + user. */
    public void validateCanClaim(RewardIntent intent, Long userId, String adSessionId) {
        if (!intent.getUserId().equals(userId)) {
            log.error("Claim rejected: intent ownership mismatch intentId={} expectedUserId={} actualUserId={}",
                intent.getId(), intent.getUserId(), userId);
            throw new RewardValidationException("OWNERSHIP_MISMATCH",
                "Bu işlemi gerçekleştirme yetkiniz yok.");
        }

        if (intent.isExpired() || intent.getStatus() == RewardIntentStatus.EXPIRED) {
            log.warn("Claim rejected: intent expired intentId={}", intent.getId());
            throw new RewardValidationException("INTENT_EXPIRED",
                "Reklam seansının süresi doldu. Lütfen tekrar deneyin.");
        }

        if (intent.isClaimed()) {
            // Idempotent re-delivery: caller handles this case gracefully.
            throw new RewardValidationException("ALREADY_CLAIMED",
                "Bu ödül daha önce alındı.");
        }

        if (intent.isTerminal()) {
            log.warn("Claim rejected: intent in terminal state intentId={} status={}", intent.getId(), intent.getStatus());
            throw new RewardValidationException("INTENT_TERMINAL",
                "Bu reklam seansı tamamlanmış veya iptal edilmiş.");
        }

        // WHY RELAXED: mark-ready is now telemetry-only (not a state gate).
        // Any non-terminal, non-expired status is claimable after a valid grant event.
        // Terminal statuses: CLAIMED, CANCELLED, FAILED, EXPIRED.
        if (intent.isTerminal()) {
            log.warn("Claim rejected: terminal status intentId={} status={}", intent.getId(), intent.getStatus());
            throw new RewardValidationException("INTENT_TERMINAL",
                "Bu reklam seansı tamamlanmış veya iptal edilmiş.");
        }

        // adSessionId replay check: same session already claimed for another intent?
        if (adSessionId != null && !adSessionId.isBlank()) {
            boolean sessionAlreadyUsed = intentRepository.existsByUserIdAndAdSessionIdAndStatus(
                userId, adSessionId, RewardIntentStatus.CLAIMED);
            if (sessionAlreadyUsed) {
                log.warn("Replay attack blocked: adSessionId={} userId={}", adSessionId, userId);
                throw new RewardValidationException("SESSION_REPLAY",
                    "Bu reklam seansı daha önce kullanıldı.");
            }
        }
    }

    /** Validates that mark-ready can proceed. */
    public void validateCanMarkReady(RewardIntent intent, Long userId) {
        if (!intent.getUserId().equals(userId)) {
            throw new RewardValidationException("OWNERSHIP_MISMATCH",
                "Bu işlemi gerçekleştirme yetkiniz yok.");
        }
        if (intent.isExpired()) {
            throw new RewardValidationException("INTENT_EXPIRED",
                "Reklam seansının süresi doldu.");
        }
        if (intent.getStatus() != RewardIntentStatus.PENDING) {
            throw new RewardValidationException("INVALID_STATE",
                "Intent beklenen durumda değil: " + intent.getStatus());
        }
    }

    public int getDailyLimit() {
        return dailyLimit;
    }

    /** Returns count of today's claimed intents. */
    public int countClaimedToday(Long userId) {
        return (int) intentRepository.countClaimedToday(userId, todayMidnightUtc());
    }

    private LocalDateTime todayMidnightUtc() {
        return LocalDate.now(ZoneOffset.UTC).atStartOfDay();
    }

    // ── Inner exception type for clean controller mapping ────────────────

    public static class RewardValidationException extends RuntimeException {
        private final String code;

        public RewardValidationException(String code, String message) {
            super(message);
            this.code = code;
        }

        public String getCode() {
            return code;
        }
    }
}
