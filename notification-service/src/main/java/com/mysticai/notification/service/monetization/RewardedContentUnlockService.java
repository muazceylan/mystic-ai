package com.mysticai.notification.service.monetization;

import com.mysticai.notification.entity.monetization.*;
import com.mysticai.notification.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RewardedContentUnlockService {

    private static final int DEFAULT_HOURLY_LIMIT = 3;
    private static final int DEFAULT_DAILY_LIMIT = 10;
    private static final int DEFAULT_COOLDOWN_MINUTES = 60;
    private static final int DEFAULT_WINDOW_MINUTES = 60;
    private static final int DEFAULT_PROGRESS_TTL_HOURS = 24;
    private static final int MAX_CONTENT_KEY_LENGTH = 512;

    private final MonetizationSettingsRepository settingsRepository;
    private final ModuleMonetizationRuleRepository ruleRepository;
    private final MonetizationActionRepository actionRepository;
    private final GuruWalletRepository walletRepository;
    private final FeatureAccessService featureAccessService;
    private final RewardedUnlockProgressRepository progressRepository;
    private final RewardedUnlockEventRepository eventRepository;

    @Transactional(readOnly = true)
    public UnlockOptionsResponse getUnlockOptions(Long userId, String moduleKey, String actionKey) {
        return getUnlockOptions(userId, moduleKey, actionKey, null);
    }

    @Transactional(readOnly = true)
    public UnlockOptionsResponse getUnlockOptions(Long userId, String moduleKey, String actionKey, String contentKey) {
        UnlockContext context = loadContext(moduleKey, actionKey, contentKey);
        RewardedUnlockProgress progress = findActiveProgress(userId, context).orElse(null);
        int requiredViews = resolveRequiredViews(context.rule(), context.tokenRequirement());
        int completedViews = progress != null ? Math.min(progress.getCompletedViews(), requiredViews) : 0;
        AdAvailabilityDto availability = resolveAvailability(userId, context, completedViews, requiredViews);
        boolean alreadyUnlocked = findUnlockedProgress(userId, context).isPresent();

        return new UnlockOptionsResponse(
                moduleKey,
                actionKey,
                context.contentKey(),
                context.tokenRequirement(),
                walletBalance(userId),
                context.tokenUnlockEnabled(),
                context.rewardedAdEnabled(),
                requiredViews,
                new RewardedAdProgressDto(completedViews, requiredViews),
                availability,
                alreadyUnlocked
        );
    }

    @Transactional
    public TokenUnlockResponse unlockWithToken(Long userId,
                                               String moduleKey,
                                               String actionKey,
                                               TokenUnlockRequest request) {
        UnlockContext context = loadContext(moduleKey, actionKey, request != null ? request.contentKey() : null);
        if (!context.tokenUnlockEnabled()) {
            return TokenUnlockResponse.failed(
                    "TOKEN_UNLOCK_DISABLED",
                    "Guru Token ile açma şu anda kullanılamıyor.",
                    walletBalance(userId)
            );
        }

        int balance = walletBalance(userId);
        if (balance < context.tokenRequirement()) {
            return TokenUnlockResponse.failed(
                    "INSUFFICIENT_GURU",
                    "Yeterli Guru Token yok. Token yükleyerek devam edebilirsin.",
                    balance
            );
        }

        String idempotencyKey = firstNonBlank(
                request != null ? request.idempotencyKey() : null,
                "content_unlock_token_" + moduleKey + "_" + actionKey + "_" + userId + "_" + UUID.randomUUID()
        );

        FeatureAccessService.FeatureAccessResponse access = featureAccessService.consumeAccess(
                userId,
                moduleKey,
                actionKey,
                request != null ? request.platform() : null,
                request != null ? request.locale() : null,
                idempotencyKey,
                request != null ? request.sourceScreen() : "unlock_sheet",
                context.contentKey()
        );

        if (access.allowed()
                && (FeatureAccessService.AccessStatus.TOKEN_CONSUMED.name().equals(access.status())
                || FeatureAccessService.AccessStatus.ALLOWED.name().equals(access.status()))) {
            int spent = FeatureAccessService.AccessStatus.TOKEN_CONSUMED.name().equals(access.status())
                    ? Math.max(0, access.chargedTokenAmount())
                    : 0;
            grantTokenContentUnlock(userId, context);
            return new TokenUnlockResponse(
                    true,
                    null,
                    "İçerik açıldı.",
                    spent,
                    access.currentBalance()
            );
        }

        String reason = access.status() != null ? access.status() : "TOKEN_UNLOCK_FAILED";
        String message = FeatureAccessService.AccessStatus.INSUFFICIENT_BALANCE.name().equals(access.status())
                ? "Yeterli Guru Token yok. Token yükleyerek devam edebilirsin."
                : "İşlem başarısız oldu. Lütfen tekrar deneyin.";
        return TokenUnlockResponse.failed(reason, message, walletBalance(userId));
    }

    @Transactional(readOnly = true)
    public RewardedAdCheckResponse checkRewardedAd(Long userId, String moduleKey, String actionKey) {
        return checkRewardedAd(userId, moduleKey, actionKey, null);
    }

    @Transactional(readOnly = true)
    public RewardedAdCheckResponse checkRewardedAd(Long userId, String moduleKey, String actionKey, String contentKey) {
        UnlockContext context = loadContext(moduleKey, actionKey, contentKey);
        int requiredViews = resolveRequiredViews(context.rule(), context.tokenRequirement());
        RewardedUnlockProgress progress = findActiveProgress(userId, context).orElse(null);
        int completedViews = progress != null ? Math.min(progress.getCompletedViews(), requiredViews) : 0;
        AdAvailabilityDto availability = resolveAvailability(userId, context, completedViews, requiredViews);
        int remaining = Math.max(0, requiredViews - completedViews);
        return new RewardedAdCheckResponse(
                availability.allowed(),
                availability.reason(),
                requiredViews,
                completedViews,
                remaining,
                availability.retryAfterSeconds(),
                availability.message()
        );
    }

    @Transactional
    public RewardedAdCompleteResponse completeRewardedAd(Long userId,
                                                         String moduleKey,
                                                         String actionKey,
                                                         RewardedAdCompleteRequest request) {
        UnlockContext context = loadContext(moduleKey, actionKey, request != null ? request.contentKey() : null);
        int requiredViews = resolveRequiredViews(context.rule(), context.tokenRequirement());

        String clientEventId = normalizeRequired(request != null ? request.clientEventId() : null, "clientEventId");
        String transactionId = normalizeOptional(request != null ? request.transactionId() : null);
        lockUserWallet(userId);

        Optional<RewardedUnlockEvent> existingEvent = eventRepository.findByClientEventId(clientEventId);
        if (existingEvent.isEmpty() && transactionId != null) {
            existingEvent = eventRepository.findByTransactionId(transactionId);
        }
        if (existingEvent.isPresent()) {
            return buildIdempotentCompleteResponse(existingEvent.get(), requiredViews);
        }

        RewardedAdCheckResponse capacity = checkRewardedAd(userId, moduleKey, actionKey, context.contentKey());
        if (!capacity.allowed()) {
            throw new RewardedUnlockBlockedException(
                    capacity.reason() != null ? capacity.reason() : "REWARDED_AD_BLOCKED",
                    capacity.message() != null ? capacity.message() : "Reklam izleme kapasiten doldu. Daha sonra tekrar deneyebilirsin.",
                    capacity.retryAfterSeconds()
            );
        }

        LocalDateTime now = LocalDateTime.now();
        RewardedUnlockProgress progress = findActiveProgress(userId, context)
                .orElseGet(() -> progressRepository.save(RewardedUnlockProgress.builder()
                        .userId(userId)
                        .moduleKey(moduleKey)
                        .actionKey(actionKey)
                        .contentKey(context.contentKey())
                        .requiredViews(requiredViews)
                        .completedViews(0)
                        .status(RewardedUnlockProgress.Status.IN_PROGRESS)
                        .expiresAt(now.plusHours(DEFAULT_PROGRESS_TTL_HOURS))
                        .build()));

        RewardedUnlockEvent event = RewardedUnlockEvent.builder()
                .progressId(progress.getId())
                .userId(userId)
                .moduleKey(moduleKey)
                .actionKey(actionKey)
                .contentKey(context.contentKey())
                .clientEventId(clientEventId)
                .transactionId(transactionId)
                .adNetwork(firstNonBlank(request != null ? request.adNetwork() : null, "admob"))
                .placement(firstNonBlank(request != null ? request.placement() : null, moduleKey + "_" + actionKey + "_unlock"))
                .eventType(RewardedUnlockEvent.EventType.AD_COMPLETED)
                .build();
        eventRepository.save(event);

        int completedViews = Math.min(requiredViews, progress.getCompletedViews() + 1);
        progress.setRequiredViews(requiredViews);
        progress.setCompletedViews(completedViews);
        progress.setLastClientEventId(clientEventId);
        progress.setLastTransactionId(transactionId);
        if (completedViews >= requiredViews) {
            progress.setStatus(RewardedUnlockProgress.Status.UNLOCKED);
            progress.setUnlockedAt(now);
        }
        progressRepository.save(progress);

        return buildCompleteResponse(progress, false);
    }

    private RewardedAdCompleteResponse buildIdempotentCompleteResponse(RewardedUnlockEvent event, int requiredViews) {
        RewardedUnlockProgress progress = progressRepository.findById(event.getProgressId())
                .orElse(null);
        if (progress == null) {
            int completed = Math.min(requiredViews, 1);
            return new RewardedAdCompleteResponse(
                    completed,
                    requiredViews,
                    Math.max(0, requiredViews - completed),
                    completed >= requiredViews,
                    null,
                    completed >= requiredViews ? "İçerik açıldı." : (requiredViews - completed) + " reklam daha izle.",
                    true
            );
        }
        return buildCompleteResponse(progress, true);
    }

    private RewardedAdCompleteResponse buildCompleteResponse(RewardedUnlockProgress progress, boolean idempotentReplay) {
        int required = Math.max(1, progress.getRequiredViews());
        int completed = Math.min(progress.getCompletedViews(), required);
        int remaining = Math.max(0, required - completed);
        boolean unlocked = progress.getStatus() == RewardedUnlockProgress.Status.UNLOCKED || remaining == 0;
        String message = unlocked
                ? "İçerik açıldı."
                : remaining + " reklam daha izle.";
        return new RewardedAdCompleteResponse(
                completed,
                required,
                remaining,
                unlocked,
                unlocked ? progress.getId().toString() : null,
                message,
                idempotentReplay
        );
    }

    private AdAvailabilityDto resolveAvailability(Long userId,
                                                  UnlockContext context,
                                                  int completedViews,
                                                  int requiredViews) {
        if (!context.rewardedAdEnabled()) {
            return new AdAvailabilityDto(
                    false,
                    "REWARDED_AD_DISABLED",
                    0,
                    "Video ile açma bu içerik için kapalı."
            );
        }
        if (completedViews >= requiredViews) {
            return new AdAvailabilityDto(true, null, 0, null);
        }

        LocalDateTime now = LocalDateTime.now();
        int hourlyLimit = positiveOrDefault(context.rule().getRewardedAdHourlyLimit(), DEFAULT_HOURLY_LIMIT);
        int dailyLimit = positiveOrDefault(context.rule().getRewardedAdDailyLimit(), DEFAULT_DAILY_LIMIT);
        int windowMinutes = positiveOrDefault(context.rule().getRewardedAdWindowMinutes(), DEFAULT_WINDOW_MINUTES);
        int cooldownMinutes = positiveOrDefault(context.rule().getRewardedAdCooldownMinutes(), DEFAULT_COOLDOWN_MINUTES);

        LocalDateTime dayStart = LocalDate.now(ZoneOffset.UTC).atStartOfDay();
        long dailyCount = eventRepository.countCompletedSince(
                userId,
                context.moduleKey(),
                context.actionKey(),
                dayStart
        );
        if (dailyCount >= dailyLimit) {
            int retryAfter = Math.max(1, (int) Duration.between(now, dayStart.plusDays(1)).getSeconds());
            return limitReached("DAILY_LIMIT_REACHED", retryAfter);
        }

        LocalDateTime windowStart = now.minusMinutes(windowMinutes);
        long windowCount = eventRepository.countCompletedSince(
                userId,
                context.moduleKey(),
                context.actionKey(),
                windowStart
        );
        if (windowCount >= hourlyLimit) {
            LocalDateTime oldestWindowEvent = eventRepository
                    .findFirstByUserIdAndModuleKeyAndActionKeyAndEventTypeAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(
                            userId,
                            context.moduleKey(),
                            context.actionKey(),
                            RewardedUnlockEvent.EventType.AD_COMPLETED,
                            windowStart
                    )
                    .map(RewardedUnlockEvent::getCreatedAt)
                    .orElse(now);
            LocalDateTime latestWindowEvent = eventRepository
                    .findFirstByUserIdAndModuleKeyAndActionKeyAndEventTypeAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
                            userId,
                            context.moduleKey(),
                            context.actionKey(),
                            RewardedUnlockEvent.EventType.AD_COMPLETED,
                            windowStart
                    )
                    .map(RewardedUnlockEvent::getCreatedAt)
                    .orElse(now);
            LocalDateTime windowRetryAt = oldestWindowEvent.plusMinutes(windowMinutes);
            LocalDateTime cooldownRetryAt = latestWindowEvent.plusMinutes(cooldownMinutes);
            int retryAfter = Math.max(
                    1,
                    (int) Duration.between(now, max(windowRetryAt, cooldownRetryAt)).getSeconds()
            );
            return limitReached("HOURLY_LIMIT_REACHED", retryAfter);
        }

        return new AdAvailabilityDto(true, null, 0, null);
    }

    private AdAvailabilityDto limitReached(String reason, int retryAfterSeconds) {
        return new AdAvailabilityDto(
                false,
                reason,
                retryAfterSeconds,
                "Reklam izleme kapasiten doldu. " + formatRetryAfter(retryAfterSeconds) + " sonra tekrar deneyebilirsin."
        );
    }

    private UnlockContext loadContext(String moduleKey, String actionKey, String contentKey) {
        String normalizedContentKey = normalizeContentKey(contentKey);
        MonetizationSettings settings = settingsRepository
                .findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Monetization config bulunamadı."));
        if (!settings.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Monetization şu anda kapalı.");
        }

        MonetizationAction action = actionRepository.findByActionKeyAndModuleKey(actionKey, moduleKey)
                .filter(MonetizationAction::isEnabled)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Monetization action bulunamadı."));

        ModuleMonetizationRule rule = ruleRepository
                .findByModuleKeyAndConfigVersion(moduleKey, settings.getConfigVersion())
                .filter(ModuleMonetizationRule::isEnabled)
                .filter(r -> r.getRolloutStatus() != ModuleMonetizationRule.RolloutStatus.DISABLED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module monetization rule bulunamadı."));

        int tokenRequirement = resolveTokenRequirement(action);
        boolean tokenUnlockEnabled = settings.isGuruEnabled()
                && rule.isGuruEnabled()
                && tokenRequirement > 0
                && (action.getUnlockType() == MonetizationAction.UnlockType.GURU_SPEND
                || action.getUnlockType() == MonetizationAction.UnlockType.AD_OR_GURU);
        boolean rewardedAdEnabled = settings.isAdsEnabled()
                && rule.isAdsEnabled()
                && Boolean.TRUE.equals(rule.getRewardedAdEnabled())
                && tokenRequirement > 0
                && (action.getUnlockType() == MonetizationAction.UnlockType.AD_WATCH
                || action.getUnlockType() == MonetizationAction.UnlockType.AD_OR_GURU
                || action.isRewardFallbackEnabled());

        return new UnlockContext(settings, rule, action, moduleKey, actionKey, normalizedContentKey, tokenRequirement, tokenUnlockEnabled, rewardedAdEnabled);
    }

    private Optional<RewardedUnlockProgress> findActiveProgress(Long userId, UnlockContext context) {
        return progressRepository
                .findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
                        userId,
                        context.moduleKey(),
                        context.actionKey(),
                        context.contentKey(),
                        RewardedUnlockProgress.Status.IN_PROGRESS,
                        LocalDateTime.now()
                );
    }

    private Optional<RewardedUnlockProgress> findUnlockedProgress(Long userId, UnlockContext context) {
        return progressRepository
                .findFirstByUserIdAndModuleKeyAndActionKeyAndContentKeyAndStatusAndExpiresAtAfterOrderByUnlockedAtDesc(
                        userId,
                        context.moduleKey(),
                        context.actionKey(),
                        context.contentKey(),
                        RewardedUnlockProgress.Status.UNLOCKED,
                        LocalDateTime.now()
                );
    }

    private void grantTokenContentUnlock(Long userId, UnlockContext context) {
        if (findUnlockedProgress(userId, context).isPresent()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        progressRepository.save(RewardedUnlockProgress.builder()
                .userId(userId)
                .moduleKey(context.moduleKey())
                .actionKey(context.actionKey())
                .contentKey(context.contentKey())
                .requiredViews(0)
                .completedViews(0)
                .status(RewardedUnlockProgress.Status.UNLOCKED)
                .unlockedAt(now)
                .expiresAt(now.plusHours(DEFAULT_PROGRESS_TTL_HOURS))
                .build());
    }

    private void lockUserWallet(Long userId) {
        walletRepository.findByUserIdForUpdate(userId)
                .orElseGet(() -> walletRepository.save(GuruWallet.builder().userId(userId).build()));
    }

    private int resolveTokenRequirement(MonetizationAction action) {
        return Math.max(1, action.getGuruCost());
    }

    private int resolveRequiredViews(ModuleMonetizationRule rule, int tokenRequirement) {
        return positiveOrDefault(rule.getRewardedAdViewsRequired(), Math.max(1, tokenRequirement));
    }

    private int walletBalance(Long userId) {
        return walletRepository.findByUserId(userId)
                .map(GuruWallet::getCurrentBalance)
                .orElse(0);
    }

    private int positiveOrDefault(Integer value, int fallback) {
        return value != null && value > 0 ? value : fallback;
    }

    private String normalizeRequired(String value, String fieldName) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is required");
        }
        return normalized;
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeContentKey(String value) {
        String normalized = normalizeOptional(value);
        if (normalized != null && normalized.length() > MAX_CONTENT_KEY_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "contentKey must be at most " + MAX_CONTENT_KEY_LENGTH + " characters");
        }
        return normalized;
    }

    private String firstNonBlank(String primary, String fallback) {
        return primary != null && !primary.isBlank() ? primary.trim() : fallback;
    }

    private LocalDateTime max(LocalDateTime left, LocalDateTime right) {
        return left.isAfter(right) ? left : right;
    }

    private String formatRetryAfter(int retryAfterSeconds) {
        int minutes = Math.max(1, (int) Math.ceil(retryAfterSeconds / 60.0));
        if (minutes >= 60 && minutes % 60 == 0) {
            int hours = minutes / 60;
            return hours == 1 ? "1 saat" : hours + " saat";
        }
        return minutes + " dakika";
    }

    public record UnlockOptionsResponse(
            String moduleKey,
            String actionKey,
            String contentKey,
            Integer tokenRequirement,
            Integer userGuruBalance,
            Boolean tokenUnlockEnabled,
            Boolean rewardedAdEnabled,
            Integer rewardedAdViewsRequired,
            RewardedAdProgressDto rewardedAdProgress,
            AdAvailabilityDto adAvailability,
            Boolean alreadyUnlocked
    ) {}

    public record RewardedAdProgressDto(int completed, int required) {}

    public record AdAvailabilityDto(
            boolean allowed,
            String reason,
            int retryAfterSeconds,
            String message
    ) {}

    public record TokenUnlockRequest(
            String platform,
            String locale,
            String idempotencyKey,
            String sourceScreen,
            String contentKey
    ) {}

    public record TokenUnlockResponse(
            boolean unlocked,
            String reason,
            String message,
            int spentGuru,
            int remainingGuru
    ) {
        static TokenUnlockResponse failed(String reason, String message, int remainingGuru) {
            return new TokenUnlockResponse(false, reason, message, 0, remainingGuru);
        }
    }

    public record RewardedAdCheckResponse(
            boolean allowed,
            String reason,
            int requiredViews,
            int completedViews,
            int remainingViews,
            int retryAfterSeconds,
            String message
    ) {}

    public record RewardedAdCheckRequest(String contentKey) {}

    public record RewardedAdCompleteRequest(
            String adNetwork,
            String placement,
            String transactionId,
            String clientEventId,
            String contentKey
    ) {}

    public record RewardedAdCompleteResponse(
            int completedViews,
            int requiredViews,
            int remainingViews,
            boolean unlocked,
            String unlockId,
            String message,
            boolean idempotentReplay
    ) {}

    public static class RewardedUnlockBlockedException extends RuntimeException {
        private final String reason;
        private final int retryAfterSeconds;

        public RewardedUnlockBlockedException(String reason, String message, int retryAfterSeconds) {
            super(message);
            this.reason = reason;
            this.retryAfterSeconds = retryAfterSeconds;
        }

        public String getReason() {
            return reason;
        }

        public int getRetryAfterSeconds() {
            return retryAfterSeconds;
        }
    }

    private record UnlockContext(
            MonetizationSettings settings,
            ModuleMonetizationRule rule,
            MonetizationAction action,
            String moduleKey,
            String actionKey,
            String contentKey,
            int tokenRequirement,
            boolean tokenUnlockEnabled,
            boolean rewardedAdEnabled
    ) {}
}
