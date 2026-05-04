package com.mysticai.notification.controller;

import com.mysticai.notification.service.monetization.BillingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
public class BillingMobileController {

    private final BillingService billingService;

    @PostMapping("/api/v1/billing/revenuecat/sync")
    public ResponseEntity<BillingService.MobileBillingStateResponse> syncRevenueCat(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestBody(required = false) BillingService.RevenueCatSyncRequest request) {
        requireUserId(userId);
        return ResponseEntity.ok(billingService.syncRevenueCat(userId, request));
    }

    @PostMapping("/api/v1/billing/restore")
    public ResponseEntity<BillingService.MobileBillingStateResponse> restorePurchases(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestBody(required = false) BillingService.RestorePurchasesRequest request) {
        requireUserId(userId);
        return ResponseEntity.ok(billingService.restorePurchases(userId, request));
    }

    private void requireUserId(Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
    }
}
