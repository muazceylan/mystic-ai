package com.mysticai.notification.controller;

import com.mysticai.notification.entity.monetization.GuruLedger;
import com.mysticai.notification.entity.monetization.GuruWallet;
import com.mysticai.notification.service.monetization.FeatureAccessService;
import com.mysticai.notification.service.monetization.GuruWalletService;
import com.mysticai.notification.service.monetization.MonetizationConfigService;
import com.mysticai.notification.service.monetization.SignupBonusService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/monetization")
@RequiredArgsConstructor
@Slf4j
public class MonetizationPublicController {

    private static final String INTERNAL_SERVICE_HEADER = "X-Internal-Service-Key";

    private final MonetizationConfigService configService;
    private final GuruWalletService walletService;
    private final FeatureAccessService featureAccessService;
    private final SignupBonusService signupBonusService;

    @Value("${internal.gateway.key}")
    private String internalGatewayKey;

    // ─── PUBLIC (anonymous OK) ─────────────────────────────────────────

    @GetMapping("/config")
    public ResponseEntity<MonetizationConfigService.MonetizationConfigResponse> getConfig(
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return ResponseEntity.ok(configService.getActiveConfig(userId));
    }

    @GetMapping("/modules/{moduleKey}")
    public ResponseEntity<MonetizationConfigService.ModuleRuleResponse> getModuleRule(
            @PathVariable String moduleKey) {
        var rule = configService.getModuleRule(moduleKey);
        return rule != null ? ResponseEntity.ok(rule) : ResponseEntity.noContent().build();
    }

    // ─── AUTHENTICATED (X-User-Id required, enforced by gateway JWT) ──

    @GetMapping("/eligibility")
    public ResponseEntity<MonetizationConfigService.EligibilityCheckResponse> checkEligibility(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam String moduleKey,
            @RequestParam String actionKey,
            @RequestParam(defaultValue = "0") int entryCount) {
        requireUserId(userId);
        return ResponseEntity.ok(configService.checkActionEligibility(userId, moduleKey, actionKey, entryCount));
    }

    @GetMapping("/access")
    public ResponseEntity<FeatureAccessService.FeatureAccessResponse> evaluateFeatureAccess(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam String moduleKey,
            @RequestParam String actionKey) {
        requireUserId(userId);
        return ResponseEntity.ok(featureAccessService.evaluateAccess(userId, moduleKey, actionKey));
    }

    @PostMapping("/access/consume")
    public ResponseEntity<FeatureAccessService.FeatureAccessResponse> consumeFeatureAccess(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestBody FeatureAccessConsumeRequest request) {
        requireUserId(userId);
        return ResponseEntity.ok(featureAccessService.consumeAccess(
                userId,
                request.moduleKey(),
                request.actionKey(),
                request.platform(),
                request.locale(),
                request.idempotencyKey(),
                request.sourceScreen()
        ));
    }

    @GetMapping("/wallet")
    public ResponseEntity<WalletResponse> getWallet(
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        requireUserId(userId);
        GuruWallet w = walletService.getOrCreateWallet(userId);
        return ResponseEntity.ok(WalletResponse.from(w));
    }

    @GetMapping("/wallet/balance")
    public ResponseEntity<BalanceResponse> getBalance(
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        requireUserId(userId);
        return ResponseEntity.ok(new BalanceResponse(walletService.getBalance(userId)));
    }

    @GetMapping("/wallet/ledger")
    public ResponseEntity<Page<LedgerEntryResponse>> getLedger(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        requireUserId(userId);
        return ResponseEntity.ok(walletService.getLedger(userId, PageRequest.of(page, size))
                .map(LedgerEntryResponse::from));
    }

    @PostMapping("/reward")
    public ResponseEntity<?> processReward(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestBody RewardRequest request) {
        requireUserId(userId);
        try {
            int resolvedAmount = featureAccessService.resolveRewardAmount(
                    request.moduleKey(),
                    request.actionKey(),
                    request.amount()
            );
            GuruLedger entry = walletService.earnReward(
                    userId, resolvedAmount, request.sourceKey(),
                    request.moduleKey(), request.actionKey(),
                    request.platform(), request.locale(),
                    request.idempotencyKey());
            return ResponseEntity.ok(entry);
        } catch (Exception e) {
            log.error("Reward processing failed: userId={}, error={}", userId, e.getMessage());
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/spend")
    public ResponseEntity<?> processSpend(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestBody SpendRequest request) {
        requireUserId(userId);
        try {
            GuruLedger entry = walletService.spendGuru(
                    userId, request.cost(), request.moduleKey(),
                    request.actionKey(), request.platform(),
                    request.locale(), request.idempotencyKey());
            return ResponseEntity.ok(entry);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(404).body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/purchase")
    public ResponseEntity<?> processPurchase(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestBody PurchaseRequest request) {
        requireUserId(userId);
        try {
            GuruLedger entry = walletService.processPurchase(
                    userId, request.guruAmount(), request.productKey(),
                    request.platform(), request.locale(),
                    request.idempotencyKey());
            return ResponseEntity.ok(entry);
        } catch (Exception e) {
            log.error("Purchase processing failed: userId={}, error={}", userId, e.getMessage());
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/internal/signup-bonus")
    public ResponseEntity<SignupBonusService.SignupBonusResult> grantSignupBonus(
            @RequestHeader(INTERNAL_SERVICE_HEADER) String serviceKey,
            @RequestBody SignupBonusGrantRequest request) {
        ensureInternalServiceKey(serviceKey);
        return ResponseEntity.ok(signupBonusService.grantSignupBonus(
                request.userId(),
                request.registrationSource(),
                request.platform(),
                request.locale()
        ));
    }

    // ─── Helpers ───────────────────────────────────────────────────────

    private void requireUserId(Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
    }

    private void ensureInternalServiceKey(String serviceKey) {
        if (serviceKey == null || !serviceKey.equals(internalGatewayKey)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid internal service key");
        }
    }

    // ─── DTOs ──────────────────────────────────────────────────────────

    public record BalanceResponse(int balance) {}

    public record RewardRequest(
            int amount, String sourceKey, String moduleKey,
            String actionKey, String platform, String locale,
            String idempotencyKey
    ) {}

    public record SpendRequest(
            int cost, String moduleKey, String actionKey,
            String platform, String locale, String idempotencyKey
    ) {}

    public record FeatureAccessConsumeRequest(
            String moduleKey,
            String actionKey,
            String platform,
            String locale,
            String idempotencyKey,
            String sourceScreen
    ) {}

    public record PurchaseRequest(
            int guruAmount, String productKey, String platform,
            String locale, String idempotencyKey
    ) {}

    public record SignupBonusGrantRequest(
            Long userId,
            String registrationSource,
            String platform,
            String locale
    ) {}

    public record ErrorResponse(String error) {}

    public record WalletResponse(
            int currentBalance,
            long lifetimeEarned,
            long lifetimeSpent,
            long lifetimePurchased,
            String lastEarnedAt,
            String lastSpentAt
    ) {
        public static WalletResponse from(GuruWallet w) {
            return new WalletResponse(
                    w.getCurrentBalance(),
                    w.getLifetimeEarned(),
                    w.getLifetimeSpent(),
                    w.getLifetimePurchased(),
                    w.getLastEarnedAt() != null ? w.getLastEarnedAt().toString() : null,
                    w.getLastSpentAt() != null ? w.getLastSpentAt().toString() : null
            );
        }
    }

    public record LedgerEntryResponse(
            String id,
            String transactionType,
            String sourceType,
            String sourceKey,
            String moduleKey,
            String actionKey,
            int amount,
            int balanceBefore,
            int balanceAfter,
            String createdAt
    ) {
        public static LedgerEntryResponse from(GuruLedger l) {
            return new LedgerEntryResponse(
                    l.getId().toString(),
                    l.getTransactionType().name(),
                    l.getSourceType().name(),
                    l.getSourceKey(),
                    l.getModuleKey(),
                    l.getActionKey(),
                    l.getAmount(),
                    l.getBalanceBefore(),
                    l.getBalanceAfter(),
                    l.getCreatedAt() != null ? l.getCreatedAt().toString() : null
            );
        }
    }
}
