package com.mysticai.notification.admin.controller.monetization;

import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.admin.service.monetization.AdminGuruWalletService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.monetization.GuruLedger;
import com.mysticai.notification.entity.monetization.GuruWallet;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/v1/monetization/wallets")
@RequiredArgsConstructor
public class AdminGuruWalletController {

    private final AdminGuruWalletService service;
    private final AdminAuthService authService;

    @GetMapping("/{userId}")
    public ResponseEntity<GuruWallet> getWallet(@PathVariable Long userId) {
        return ResponseEntity.ok(service.getWallet(userId));
    }

    @GetMapping("/{userId}/ledger")
    public ResponseEntity<Page<GuruLedger>> getLedger(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.getLedger(userId, PageRequest.of(page, size)));
    }

    @PostMapping("/{userId}/grant")
    public ResponseEntity<GuruLedger> grant(@PathVariable Long userId,
                                             @RequestBody AdjustmentRequest request,
                                             Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        return ResponseEntity.ok(service.grantGuru(userId, request.amount(), request.reason(),
                admin.getId(), admin.getEmail(), admin.getRole()));
    }

    @PostMapping("/{userId}/revoke")
    public ResponseEntity<GuruLedger> revoke(@PathVariable Long userId,
                                              @RequestBody AdjustmentRequest request,
                                              Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        return ResponseEntity.ok(service.revokeGuru(userId, request.amount(), request.reason(),
                admin.getId(), admin.getEmail(), admin.getRole()));
    }

    public record AdjustmentRequest(int amount, String reason) {}
}
