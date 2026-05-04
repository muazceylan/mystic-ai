package com.mysticai.notification.admin.service.monetization;

import com.mysticai.notification.admin.service.AuditLogService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.monetization.GuruWallet;
import com.mysticai.notification.entity.monetization.PurchaseEvent;
import com.mysticai.notification.entity.monetization.SubscriptionEntitlement;
import com.mysticai.notification.repository.PurchaseEventRepository;
import com.mysticai.notification.service.monetization.EntitlementService;
import com.mysticai.notification.service.monetization.GuruWalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Admin-facing read + manual override surface for subscription entitlements.
 *
 * Manual grant / revoke uses {@link EntitlementService} so the same business
 * rules (active = TRIALING/ACTIVE/GRACE_PERIOD/CANCELLED_ACTIVE-with-future-period)
 * apply consistently across webhook-driven and admin-driven changes.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminUserEntitlementService {

    private final EntitlementService entitlementService;
    private final PurchaseEventRepository purchaseEventRepository;
    private final GuruWalletService walletService;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public UserEntitlementSnapshot getSnapshot(Long userId) {
        EntitlementService.EntitlementSnapshot entitlement = entitlementService.getSnapshot(userId);
        List<SubscriptionEntitlement> all = entitlementService.findAllForUser(userId);
        var recentEvents = purchaseEventRepository
                .findAllByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 20))
                .getContent();
        GuruWallet wallet = walletService.getOrCreateWallet(userId);

        return new UserEntitlementSnapshot(
                userId,
                entitlement,
                all,
                recentEvents,
                wallet.getCurrentBalance(),
                wallet.getLifetimeEarned(),
                wallet.getLifetimeSpent(),
                wallet.getLifetimePurchased()
        );
    }

    @Transactional
    public SubscriptionEntitlement grant(Long userId,
                                          ManualGrantRequest request,
                                          AdminUser admin) {
        if (request == null || request.reason() == null || request.reason().isBlank()) {
            throw new IllegalArgumentException("reason is required for manual entitlement grant");
        }

        SubscriptionEntitlement saved = entitlementService.manualGrant(
                userId,
                request.entitlementKey(),
                request.productId(),
                request.currentPeriodEndAt());

        auditLogService.log(admin.getId(), admin.getEmail(), admin.getRole(),
                AuditLog.ActionType.ENTITLEMENT_GRANTED,
                AuditLog.EntityType.SUBSCRIPTION_ENTITLEMENT,
                saved.getId().toString(),
                "userId=" + userId + " key=" + saved.getEntitlementKey() + " reason=" + sanitize(request.reason()),
                null, saved);

        log.info("Admin entitlement grant: userId={} key={} adminId={} reason={}",
                userId, saved.getEntitlementKey(), admin.getId(), sanitize(request.reason()));
        return saved;
    }

    @Transactional
    public SubscriptionEntitlement revoke(Long userId,
                                           ManualRevokeRequest request,
                                           AdminUser admin) {
        if (request == null || request.reason() == null || request.reason().isBlank()) {
            throw new IllegalArgumentException("reason is required for manual entitlement revoke");
        }

        String key = request.entitlementKey() != null
                ? request.entitlementKey()
                : EntitlementService.DEFAULT_ENTITLEMENT_KEY;

        SubscriptionEntitlement saved = entitlementService.manualRevoke(userId, key);

        auditLogService.log(admin.getId(), admin.getEmail(), admin.getRole(),
                AuditLog.ActionType.ENTITLEMENT_REVOKED,
                AuditLog.EntityType.SUBSCRIPTION_ENTITLEMENT,
                saved.getId().toString(),
                "userId=" + userId + " key=" + key + " reason=" + sanitize(request.reason()),
                null, saved);

        log.info("Admin entitlement revoke: userId={} key={} adminId={} reason={}",
                userId, key, admin.getId(), sanitize(request.reason()));
        return saved;
    }

    private static String sanitize(String s) {
        if (s == null) return null;
        return s.replaceAll("[\\r\\n\\t]", " ").trim();
    }

    public record UserEntitlementSnapshot(
            Long userId,
            EntitlementService.EntitlementSnapshot active,
            List<SubscriptionEntitlement> entitlements,
            List<PurchaseEvent> recentPurchaseEvents,
            int walletBalance,
            long lifetimeEarned,
            long lifetimeSpent,
            long lifetimePurchased
    ) {}

    public record ManualGrantRequest(
            String entitlementKey,
            String productId,
            LocalDateTime currentPeriodEndAt,
            String reason
    ) {}

    public record ManualRevokeRequest(
            String entitlementKey,
            String reason
    ) {}
}
