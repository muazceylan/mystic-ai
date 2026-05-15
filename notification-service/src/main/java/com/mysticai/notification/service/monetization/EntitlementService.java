package com.mysticai.notification.service.monetization;

import com.mysticai.notification.entity.monetization.MonetizationSettings;
import com.mysticai.notification.entity.monetization.SubscriptionEntitlement;
import com.mysticai.notification.repository.GuruWalletRepository;
import com.mysticai.notification.repository.MonetizationSettingsRepository;
import com.mysticai.notification.repository.SubscriptionEntitlementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

/**
 * Read-side aggregator for the user's premium / trial entitlement state.
 *
 * Phase 1 contract:
 *   - The repository, snapshot record and read paths exist.
 *   - RevenueCat writes entitlement rows via the webhook. The entitlement key
 *     must match the RevenueCat entitlement identifier exactly.
 *
 * The endpoint shape is deliberately the one we want to keep stable across
 * Phase 2 → Phase 4, so mobile can integrate against it without a rewrite.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EntitlementService {

    public static final String DEFAULT_ENTITLEMENT_KEY = "Astro Guru Pro";

    private final SubscriptionEntitlementRepository entitlementRepository;
    private final MonetizationSettingsRepository settingsRepository;
    private final GuruWalletRepository walletRepository;

    /**
     * Returns the user's currently-active entitlement for the configured
     * RevenueCat premium entitlement key, or an empty snapshot if none.
     */
    @Transactional(readOnly = true)
    public EntitlementSnapshot getSnapshot(Long userId) {
        if (userId == null) {
            return EntitlementSnapshot.empty();
        }

        Optional<SubscriptionEntitlement> active = findActiveEntitlement(userId, DEFAULT_ENTITLEMENT_KEY);
        int tokenBalance = walletRepository.findByUserId(userId)
                .map(wallet -> wallet.getCurrentBalance())
                .orElse(0);
        return active
                .map(entitlement -> EntitlementSnapshot.from(entitlement, tokenBalance))
                .orElse(EntitlementSnapshot.empty(tokenBalance));
    }

    /**
     * Whether the user is currently entitled to the given key (premium / trial / grace).
     * Used by the gate logic and feature flags. Phase 1: always false unless
     * a row was inserted out-of-band (admin grant in Phase 2).
     */
    @Transactional(readOnly = true)
    public boolean hasActiveEntitlement(Long userId, String entitlementKey) {
        if (userId == null || entitlementKey == null) return false;
        return findActiveEntitlement(userId, entitlementKey)
                .map(SubscriptionEntitlement::isActive)
                .orElse(false);
    }

    /**
     * Whether the user qualifies for the platform-default trial offer.
     * Phase 1 heuristic: trial enabled at config, defaultTrialDays > 0,
     * and the user has never had any entitlement row for the key.
     */
    @Transactional(readOnly = true)
    public boolean isTrialEligible(Long userId, String entitlementKey) {
        MonetizationSettings settings = activeSettings();
        if (settings == null || !settings.isTrialEnabled() || settings.getDefaultTrialDays() <= 0) {
            return false;
        }
        if (userId == null) return true; // anonymous paywall preview
        List<SubscriptionEntitlement> rows = entitlementRepository.findAllByUserId(userId);
        return rows.stream()
                .filter(r -> entitlementKey == null || entitlementKey.equals(r.getEntitlementKey()))
                .findAny()
                .isEmpty();
    }

    private Optional<SubscriptionEntitlement> findActiveEntitlement(Long userId, String entitlementKey) {
        // findFirst...OrderByUpdatedAtDesc returns the latest row regardless of
        // status; we then keep only active ones. This avoids juggling a
        // separate "active" index in Phase 1 while keeping the lookup cheap.
        return entitlementRepository
                .findAllByUserId(userId).stream()
                .filter(r -> entitlementKey.equals(r.getEntitlementKey()))
                .filter(SubscriptionEntitlement::isActive)
                .max(Comparator.comparing(
                        SubscriptionEntitlement::getUpdatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())));
    }

    private MonetizationSettings activeSettings() {
        return settingsRepository
                .findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED)
                .orElse(null);
    }

    // ─── Write APIs (Phase 2) ──────────────────────────────────────────

    /**
     * Look up the entitlement row a webhook should target. The lookup order is
     * deterministic so two concurrent webhooks for the same purchase never
     * create two competing rows:
     *   1. (provider, originalTransactionId)
     *   2. (userId, entitlementKey) latest row
     */
    @Transactional
    public SubscriptionEntitlement findOrCreateForWebhook(
            Long userId,
            String entitlementKey,
            SubscriptionEntitlement.BillingProvider provider,
            String originalTransactionId) {

        if (originalTransactionId != null && !originalTransactionId.isBlank()) {
            Optional<SubscriptionEntitlement> existing = entitlementRepository
                    .findFirstByProviderAndOriginalTransactionIdOrderByUpdatedAtDesc(provider, originalTransactionId);
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        String key = entitlementKey != null ? entitlementKey : DEFAULT_ENTITLEMENT_KEY;
        return entitlementRepository
                .findFirstByUserIdAndEntitlementKeyOrderByUpdatedAtDesc(userId, key)
                .orElseGet(() -> SubscriptionEntitlement.builder()
                        .userId(userId)
                        .entitlementKey(key)
                        .provider(provider)
                        .build());
    }

    /**
     * Apply a mutator to an entitlement and save. Bumps lastEventAt when the
     * incoming event timestamp is later than the row's existing lastEventAt
     * (older webhooks that arrive late never overwrite newer state).
     */
    @Transactional
    public SubscriptionEntitlement applyAndSave(
            SubscriptionEntitlement entitlement,
            LocalDateTime eventAt,
            Consumer<SubscriptionEntitlement> mutator) {

        if (entitlement.getLastEventAt() != null
                && eventAt != null
                && eventAt.isBefore(entitlement.getLastEventAt())) {
            log.warn("Skipping out-of-order webhook: userId={}, entitlementKey={}, eventAt={} < lastEventAt={}",
                    entitlement.getUserId(), entitlement.getEntitlementKey(), eventAt, entitlement.getLastEventAt());
            return entitlement;
        }

        mutator.accept(entitlement);
        if (eventAt != null) {
            entitlement.setLastEventAt(eventAt);
        } else {
            entitlement.setLastEventAt(LocalDateTime.now());
        }
        return entitlementRepository.save(entitlement);
    }

    /**
     * Admin-driven manual grant. Creates a CANCELLED_ACTIVE row (so the
     * existing CANCELLED_ACTIVE + future-period gate works) with provider
     * ADMIN_GRANT.
     */
    @Transactional
    public SubscriptionEntitlement manualGrant(
            Long userId,
            String entitlementKey,
            String productId,
            LocalDateTime currentPeriodEndAt) {

        String key = entitlementKey != null ? entitlementKey : DEFAULT_ENTITLEMENT_KEY;
        SubscriptionEntitlement row = entitlementRepository
                .findFirstByUserIdAndEntitlementKeyOrderByUpdatedAtDesc(userId, key)
                .orElseGet(() -> SubscriptionEntitlement.builder()
                        .userId(userId)
                        .entitlementKey(key)
                        .build());

        row.setProvider(SubscriptionEntitlement.BillingProvider.ADMIN_GRANT);
        row.setStore(SubscriptionEntitlement.Store.ADMIN);
        row.setStatus(SubscriptionEntitlement.Status.ACTIVE);
        row.setProductId(productId);
        row.setCurrentPeriodStartAt(LocalDateTime.now());
        row.setCurrentPeriodEndAt(currentPeriodEndAt);
        row.setAutoRenewEnabled(false);
        row.setCancelledAt(null);
        row.setExpiredAt(null);
        row.setLastEventAt(LocalDateTime.now());

        return entitlementRepository.save(row);
    }

    @Transactional
    public SubscriptionEntitlement manualRevoke(Long userId, String entitlementKey) {
        String key = entitlementKey != null ? entitlementKey : DEFAULT_ENTITLEMENT_KEY;
        SubscriptionEntitlement row = entitlementRepository
                .findFirstByUserIdAndEntitlementKeyOrderByUpdatedAtDesc(userId, key)
                .orElseThrow(() -> new IllegalStateException(
                        "No entitlement to revoke for userId=" + userId + ", key=" + key));

        row.setStatus(SubscriptionEntitlement.Status.REVOKED);
        row.setExpiredAt(LocalDateTime.now());
        row.setLastEventAt(LocalDateTime.now());
        return entitlementRepository.save(row);
    }

    @Transactional(readOnly = true)
    public List<SubscriptionEntitlement> findAllForUser(Long userId) {
        return entitlementRepository.findAllByUserId(userId);
    }

    /**
     * Stable response contract for /api/v1/me/entitlements.
     * `status` mirrors SubscriptionEntitlement.Status; "NONE" when no row exists.
     */
    public record EntitlementSnapshot(
            boolean premiumActive,
            boolean trialing,
            String status,
            String entitlementKey,
            String productId,
            String provider,
            String store,
            LocalDateTime trialStartAt,
            LocalDateTime trialEndAt,
            LocalDateTime currentPeriodStartAt,
            LocalDateTime currentPeriodEndAt,
            boolean autoRenewEnabled,
            LocalDateTime cancelledAt,
            LocalDateTime expiredAt,
            LocalDateTime lastEventAt,
            List<String> entitlements,
            int tokenBalance
    ) {
        public static EntitlementSnapshot empty() {
            return empty(0);
        }

        public static EntitlementSnapshot empty(int tokenBalance) {
            return new EntitlementSnapshot(
                    false, false, "NONE",
                    null, null, null, null,
                    null, null, null, null,
                    false,
                    null, null, null,
                    List.of(),
                    tokenBalance
            );
        }

        public static EntitlementSnapshot from(SubscriptionEntitlement e, int tokenBalance) {
            boolean active = e.isActive();
            return new EntitlementSnapshot(
                    active,
                    e.isTrialing(),
                    e.getStatus().name(),
                    e.getEntitlementKey(),
                    e.getProductId(),
                    e.getProvider() != null ? e.getProvider().name() : null,
                    e.getStore() != null ? e.getStore().name() : null,
                    e.getTrialStartAt(),
                    e.getTrialEndAt(),
                    e.getCurrentPeriodStartAt(),
                    e.getCurrentPeriodEndAt(),
                    e.isAutoRenewEnabled(),
                    e.getCancelledAt(),
                    e.getExpiredAt(),
                    e.getLastEventAt(),
                    active ? List.of(e.getEntitlementKey()) : List.of(),
                    tokenBalance
            );
        }
    }
}
