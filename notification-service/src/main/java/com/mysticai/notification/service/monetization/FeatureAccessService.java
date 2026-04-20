package com.mysticai.notification.service.monetization;

import com.mysticai.notification.entity.monetization.GuruLedger;
import com.mysticai.notification.entity.monetization.GuruWallet;
import com.mysticai.notification.entity.monetization.ModuleMonetizationRule;
import com.mysticai.notification.entity.monetization.MonetizationAction;
import com.mysticai.notification.entity.monetization.MonetizationSettings;
import com.mysticai.notification.repository.GuruLedgerRepository;
import com.mysticai.notification.repository.GuruWalletRepository;
import com.mysticai.notification.repository.ModuleMonetizationRuleRepository;
import com.mysticai.notification.repository.MonetizationActionRepository;
import com.mysticai.notification.repository.MonetizationSettingsRepository;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeatureAccessService {

    private final MonetizationSettingsRepository settingsRepository;
    private final ModuleMonetizationRuleRepository ruleRepository;
    private final MonetizationActionRepository actionRepository;
    private final GuruWalletRepository walletRepository;
    private final GuruLedgerRepository ledgerRepository;
    private final GuruWalletService guruWalletService;
    private final MeterRegistry meterRegistry;

    @Transactional(readOnly = true)
    public FeatureAccessResponse evaluateAccess(Long userId, String moduleKey, String actionKey) {
        MonetizationContext context = loadContext(moduleKey, actionKey);
        if (!context.ready()) {
            return buildUnavailableResponse(context);
        }
        return evaluateContext(userId, context, null, null, null, false);
    }

    @Transactional
    public FeatureAccessResponse consumeAccess(Long userId,
                                               String moduleKey,
                                               String actionKey,
                                               String platform,
                                               String locale,
                                               String idempotencyKey,
                                               String sourceScreen) {
        MonetizationContext context = loadContext(moduleKey, actionKey);
        if (!context.ready()) {
            return buildUnavailableResponse(context);
        }

        if (idempotencyKey != null && ledgerRepository.existsByIdempotencyKey(idempotencyKey)) {
            GuruLedger existing = ledgerRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
            int balance = walletRepository.findByUserId(userId).map(GuruWallet::getCurrentBalance).orElse(0);
            log.info("Feature access duplicate consume blocked: userId={}, moduleKey={}, actionKey={}, idempotencyKey={}",
                    userId, moduleKey, actionKey, idempotencyKey);
            incrementMetric("idempotency.hit", "operation", "feature_consume", "featureKey", actionKey);
            return buildAllowedResponse(
                    context,
                    balance,
                    AccessStatus.TOKEN_CONSUMED,
                    "feature_access_replayed",
                    ActionType.CONTINUE,
                    true
            );
        }

        GuruWallet wallet = walletRepository.findByUserIdForUpdate(userId)
                .orElseGet(() -> walletRepository.save(GuruWallet.builder().userId(userId).build()));

        FeatureAccessResponse evaluation = evaluateContext(
                userId,
                context,
                wallet,
                platform,
                locale,
                true
        );

        if (!evaluation.allowed() || !evaluation.requiresToken() || evaluation.tokenCost() <= 0) {
            return evaluation;
        }

        String metadataJson = buildConsumeMetadataJson(sourceScreen, context.action().getAnalyticsKey());
        GuruLedger ledger = guruWalletService.spendGuru(
                userId,
                evaluation.tokenCost(),
                moduleKey,
                actionKey,
                platform,
                locale,
                idempotencyKey,
                metadataJson
        );

        log.info("Feature token consumed: userId={}, moduleKey={}, actionKey={}, cost={}, balanceAfter={}",
                userId,
                moduleKey,
                actionKey,
                evaluation.tokenCost(),
                ledger != null ? ledger.getBalanceAfter() : null);
        incrementMetric("feature_token.consumed", "featureKey", actionKey, "moduleKey", moduleKey);

        return buildAllowedResponse(
                context,
                ledger != null ? ledger.getBalanceAfter() : walletRepository.findByUserId(userId).map(GuruWallet::getCurrentBalance).orElse(0),
                AccessStatus.TOKEN_CONSUMED,
                "feature_token_consumed",
                ActionType.CONTINUE,
                true
        );
    }

    @Transactional(readOnly = true)
    public int resolveRewardAmount(String moduleKey, String actionKey, Integer requestedAmount) {
        MonetizationAction action = actionRepository.findByActionKeyAndModuleKey(actionKey, moduleKey).orElse(null);
        if (action != null && action.getRewardAmount() > 0) {
            return action.getRewardAmount();
        }

        MonetizationSettings settings = settingsRepository
                .findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED)
                .orElse(null);
        if (settings != null) {
            ModuleMonetizationRule rule = ruleRepository
                    .findByModuleKeyAndConfigVersion(moduleKey, settings.getConfigVersion())
                    .orElse(null);
            if (rule != null && rule.getGuruRewardAmountPerCompletedAd() > 0) {
                return rule.getGuruRewardAmountPerCompletedAd();
            }
        }

        return Math.max(0, requestedAmount != null ? requestedAmount : 0);
    }

    private FeatureAccessResponse evaluateContext(Long userId,
                                                  MonetizationContext context,
                                                  GuruWallet lockedWallet,
                                                  String platform,
                                                  String locale,
                                                  boolean strict) {
        MonetizationAction action = context.action();
        ModuleMonetizationRule rule = context.rule();
        MonetizationSettings settings = context.settings();

        int tokenCost = Math.max(0, action.getGuruCost());
        int balance = lockedWallet != null
                ? lockedWallet.getCurrentBalance()
                : walletRepository.findByUserId(userId).map(GuruWallet::getCurrentBalance).orElse(0);

        long dailyUsage = countUsage(userId, context, LocalDate.now(ZoneOffset.UTC).atStartOfDay());
        long weeklyUsage = countUsage(userId, context, LocalDate.now(ZoneOffset.UTC).minusDays(6).atStartOfDay());
        if (action.getDailyLimit() > 0 && dailyUsage >= action.getDailyLimit()) {
            log.info("Feature access denied due to daily limit: userId={}, moduleKey={}, actionKey={}, dailyUsage={}, dailyLimit={}",
                    userId, context.requestedModuleKey(), context.requestedActionKey(), dailyUsage, action.getDailyLimit());
            incrementMetric("feature_access.denied", "reason", "daily_limit", "featureKey", context.requestedActionKey());
            return buildBlockedResponse(context, balance, AccessStatus.LIMIT_REACHED, "daily_feature_limit_reached", ActionType.NONE, dailyUsage, weeklyUsage);
        }
        if (action.getWeeklyLimit() > 0 && weeklyUsage >= action.getWeeklyLimit()) {
            log.info("Feature access denied due to weekly limit: userId={}, moduleKey={}, actionKey={}, weeklyUsage={}, weeklyLimit={}",
                    userId, context.requestedModuleKey(), context.requestedActionKey(), weeklyUsage, action.getWeeklyLimit());
            incrementMetric("feature_access.denied", "reason", "weekly_limit", "featureKey", context.requestedActionKey());
            return buildBlockedResponse(context, balance, AccessStatus.LIMIT_REACHED, "weekly_feature_limit_reached", ActionType.NONE, dailyUsage, weeklyUsage);
        }

        boolean requiresToken = action.getUnlockType() != MonetizationAction.UnlockType.FREE && tokenCost > 0;
        if (!requiresToken) {
            incrementMetric("feature_access.allowed", "mode", "free", "featureKey", context.requestedActionKey());
            return buildAllowedResponse(context, balance, AccessStatus.ALLOWED, "feature_access_allowed", ActionType.CONTINUE, false);
        }

        boolean guruAvailable = settings.isGuruEnabled() && rule.isGuruEnabled();
        boolean rewardFallbackAvailable = action.isRewardFallbackEnabled() && settings.isAdsEnabled() && rule.isAdsEnabled();
        if (guruAvailable && balance >= tokenCost) {
            incrementMetric("feature_access.allowed", "mode", "token_available", "featureKey", context.requestedActionKey());
            return buildAllowedResponse(context, balance, AccessStatus.TOKEN_REQUIRED, "feature_token_required", ActionType.SPEND_TOKEN, false);
        }

        if (rewardFallbackAvailable) {
            log.info("Feature access insufficient balance with rewarded fallback: userId={}, moduleKey={}, actionKey={}, balance={}, tokenCost={}",
                    userId, context.requestedModuleKey(), context.requestedActionKey(), balance, tokenCost);
            incrementMetric("feature_access.insufficient_balance", "fallback", "rewarded_ad", "featureKey", context.requestedActionKey());
            return buildBlockedResponse(
                    context,
                    balance,
                    AccessStatus.INSUFFICIENT_BALANCE,
                    "feature_access_insufficient_balance",
                    ActionType.WATCH_REWARDED_AD,
                    dailyUsage,
                    weeklyUsage
            );
        }

        ActionType fallbackAction = context.purchaseFallbackAvailable() ? ActionType.OPEN_PURCHASE : ActionType.NONE;
        log.info("Feature access denied due to insufficient balance: userId={}, moduleKey={}, actionKey={}, balance={}, tokenCost={}, fallbackAction={}",
                userId, context.requestedModuleKey(), context.requestedActionKey(), balance, tokenCost, fallbackAction);
        incrementMetric("feature_access.denied", "reason", "insufficient_balance", "featureKey", context.requestedActionKey());
        return buildBlockedResponse(
                context,
                balance,
                AccessStatus.INSUFFICIENT_BALANCE,
                "feature_access_insufficient_balance",
                fallbackAction,
                dailyUsage,
                weeklyUsage
        );
    }

    private MonetizationContext loadContext(String moduleKey, String actionKey) {
        MonetizationSettings settings = settingsRepository
                .findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED)
                .orElse(null);
        if (settings == null || !settings.isEnabled()) {
            return MonetizationContext.disabled(moduleKey, actionKey);
        }

        MonetizationAction action = actionRepository.findByActionKeyAndModuleKey(actionKey, moduleKey).orElse(null);
        if (action == null || !action.isEnabled()) {
            return MonetizationContext.actionMissing(settings, moduleKey, actionKey);
        }

        ModuleMonetizationRule rule = ruleRepository
                .findByModuleKeyAndConfigVersion(moduleKey, settings.getConfigVersion())
                .orElse(null);
        if (rule == null || !rule.isEnabled() || rule.getRolloutStatus() == ModuleMonetizationRule.RolloutStatus.DISABLED) {
            return MonetizationContext.ruleMissing(settings, action, moduleKey, actionKey);
        }

        return new MonetizationContext(settings, rule, action, moduleKey, actionKey, true, null);
    }

    private FeatureAccessResponse buildUnavailableResponse(MonetizationContext context) {
        if (context.settings() == null) {
            return new FeatureAccessResponse(
                    false,
                    false,
                    false,
                    0,
                    0,
                    false,
                    0,
                    context.requestedActionKey(),
                    context.requestedModuleKey(),
                    ActionType.NONE.name(),
                    AccessStatus.MONETIZATION_DISABLED.name(),
                    "monetization_disabled",
                    false,
                    false,
                    null,
                    null,
                    null,
                    null,
                    null,
                    0,
                    0,
                    0,
                    0
            );
        }

        MonetizationAction action = context.action();
        return new FeatureAccessResponse(
                false,
                true,
                action != null && Math.max(0, action.getGuruCost()) > 0,
                action != null ? Math.max(0, action.getGuruCost()) : 0,
                0,
                false,
                action != null ? resolveRewardAmount(context.moduleKey(), context.actionKey(), action.getRewardAmount()) : 0,
                context.requestedActionKey(),
                context.requestedModuleKey(),
                ActionType.NONE.name(),
                AccessStatus.FEATURE_DISABLED.name(),
                context.failureReason() != null ? context.failureReason() : "feature_disabled",
                false,
                false,
                action != null ? action.getAnalyticsKey() : null,
                action != null ? firstNonBlank(action.getDialogTitle(), action.getDisplayName()) : null,
                action != null ? firstNonBlank(action.getDialogDescription(), action.getDescription()) : null,
                action != null ? action.getPrimaryCtaLabel() : null,
                action != null ? action.getSecondaryCtaLabel() : null,
                action != null ? Math.max(0, action.getDailyLimit()) : 0,
                action != null ? Math.max(0, action.getWeeklyLimit()) : 0,
                0,
                0
        );
    }

    private FeatureAccessResponse buildAllowedResponse(MonetizationContext context,
                                                       int balance,
                                                       AccessStatus status,
                                                       String message,
                                                       ActionType actionType,
                                                       boolean allowed) {
        return new FeatureAccessResponse(
                allowed || status == AccessStatus.ALLOWED || status == AccessStatus.TOKEN_REQUIRED || status == AccessStatus.TOKEN_CONSUMED,
                true,
                Math.max(0, context.action().getGuruCost()) > 0,
                Math.max(0, context.action().getGuruCost()),
                balance,
                context.rewardFallbackAvailable(),
                context.rewardAmount(),
                context.action().getActionKey(),
                context.action().getModuleKey(),
                actionType.name(),
                status.name(),
                message,
                context.purchaseFallbackAvailable(),
                context.settings().isGuruEnabled() && context.rule().isGuruEnabled(),
                context.action().getAnalyticsKey(),
                firstNonBlank(context.action().getDialogTitle(), context.action().getDisplayName()),
                firstNonBlank(context.action().getDialogDescription(), context.action().getDescription()),
                context.action().getPrimaryCtaLabel(),
                context.action().getSecondaryCtaLabel(),
                Math.max(0, context.action().getDailyLimit()),
                Math.max(0, context.action().getWeeklyLimit()),
                0,
                0
        );
    }

    private FeatureAccessResponse buildBlockedResponse(MonetizationContext context,
                                                       int balance,
                                                       AccessStatus status,
                                                       String message,
                                                       ActionType actionType,
                                                       long dailyUsage,
                                                       long weeklyUsage) {
        return new FeatureAccessResponse(
                false,
                true,
                Math.max(0, context.action().getGuruCost()) > 0,
                Math.max(0, context.action().getGuruCost()),
                balance,
                context.rewardFallbackAvailable(),
                context.rewardAmount(),
                context.action().getActionKey(),
                context.action().getModuleKey(),
                actionType.name(),
                status.name(),
                message,
                context.purchaseFallbackAvailable(),
                context.settings().isGuruEnabled() && context.rule().isGuruEnabled(),
                context.action().getAnalyticsKey(),
                firstNonBlank(context.action().getDialogTitle(), context.action().getDisplayName()),
                firstNonBlank(context.action().getDialogDescription(), context.action().getDescription()),
                context.action().getPrimaryCtaLabel(),
                context.action().getSecondaryCtaLabel(),
                Math.max(0, context.action().getDailyLimit()),
                Math.max(0, context.action().getWeeklyLimit()),
                dailyUsage,
                weeklyUsage
        );
    }

    private long countUsage(Long userId, MonetizationContext context, LocalDateTime since) {
        return ledgerRepository.countByUserIdAndModuleKeyAndActionKeyAndTransactionTypeSince(
                userId,
                context.requestedModuleKey(),
                context.actionKey(),
                GuruLedger.TransactionType.GURU_SPENT,
                since
        );
    }

    private String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary;
        }
        return fallback;
    }

    private String buildConsumeMetadataJson(String sourceScreen, String analyticsKey) {
        String safeSourceScreen = sourceScreen == null ? "" : sourceScreen.replace("\"", "'");
        String safeAnalyticsKey = analyticsKey == null ? "" : analyticsKey.replace("\"", "'");
        return "{\"sourceScreen\":\"" + safeSourceScreen + "\",\"analyticsKey\":\"" + safeAnalyticsKey + "\"}";
    }

    private void incrementMetric(String name, String... tags) {
        meterRegistry.counter("notification.monetization." + name, tags).increment();
    }

    public enum AccessStatus {
        ALLOWED,
        TOKEN_REQUIRED,
        TOKEN_CONSUMED,
        INSUFFICIENT_BALANCE,
        LIMIT_REACHED,
        FEATURE_DISABLED,
        MONETIZATION_DISABLED
    }

    public enum ActionType {
        CONTINUE,
        SPEND_TOKEN,
        WATCH_REWARDED_AD,
        OPEN_PURCHASE,
        NONE
    }

    public record FeatureAccessResponse(
            boolean allowed,
            boolean monetizationActive,
            boolean requiresToken,
            int tokenCost,
            int currentBalance,
            boolean rewardedAdAvailable,
            int rewardTokenAmount,
            String featureKey,
            String moduleKey,
            String actionType,
            String status,
            String message,
            boolean purchaseFallbackAvailable,
            boolean guruUnlockAvailable,
            String analyticsKey,
            String dialogTitle,
            String dialogDescription,
            String primaryCtaLabel,
            String secondaryCtaLabel,
            int dailyLimit,
            int weeklyLimit,
            long dailyUsageCount,
            long weeklyUsageCount
    ) {}

    private record MonetizationContext(
            MonetizationSettings settings,
            ModuleMonetizationRule rule,
            MonetizationAction action,
            String requestedModuleKey,
            String requestedActionKey,
            boolean ready,
            String failureReason
    ) {
        static MonetizationContext disabled(String moduleKey, String actionKey) {
            return new MonetizationContext(null, null, null, moduleKey, actionKey, false, "monetization_disabled");
        }

        static MonetizationContext actionMissing(MonetizationSettings settings, String moduleKey, String actionKey) {
            return new MonetizationContext(settings, null, null, moduleKey, actionKey, false, "feature_not_found");
        }

        static MonetizationContext ruleMissing(MonetizationSettings settings,
                                               MonetizationAction action,
                                               String moduleKey,
                                               String actionKey) {
            return new MonetizationContext(settings, null, action, moduleKey, actionKey, false, "feature_disabled");
        }

        boolean rewardFallbackAvailable() {
            return action != null
                    && action.isRewardFallbackEnabled()
                    && settings != null
                    && settings.isAdsEnabled()
                    && rule != null
                    && rule.isAdsEnabled();
        }

        boolean purchaseFallbackAvailable() {
            return settings != null
                    && settings.isGuruPurchaseEnabled()
                    && rule != null
                    && rule.isGuruPurchaseEnabled();
        }

        int rewardAmount() {
            if (action != null && action.getRewardAmount() > 0) {
                return action.getRewardAmount();
            }
            if (rule != null) {
                return Math.max(0, rule.getGuruRewardAmountPerCompletedAd());
            }
            return 0;
        }

        String moduleKey() {
            return action != null ? action.getModuleKey() : null;
        }

        String actionKey() {
            return action != null ? action.getActionKey() : null;
        }
    }
}
