package com.mysticai.notification.controller;

import com.mysticai.notification.service.monetization.BillingService;
import com.mysticai.notification.service.monetization.EntitlementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Phase 1 paywall + entitlement read endpoints.
 *
 *   GET /api/v1/monetization/paywall   — anonymous OK; richer when X-User-Id present
 *   GET /api/v1/me/entitlements        — requires X-User-Id (gateway JWT)
 *
 * The response shapes are the contract the mobile app will integrate against
 * in Phase 3, so they are stable from this phase forward even though the
 * underlying entitlement rows are not populated yet.
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class BillingPaywallController {

    private final BillingService billingService;
    private final EntitlementService entitlementService;

    @GetMapping("/api/v1/monetization/paywall")
    public ResponseEntity<BillingService.PaywallResponse> getPaywall(
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return ResponseEntity.ok(billingService.getPaywall(userId));
    }

    @GetMapping("/api/v1/me/entitlements")
    public ResponseEntity<EntitlementService.EntitlementSnapshot> getMyEntitlements(
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return ResponseEntity.ok(entitlementService.getSnapshot(userId));
    }
}
