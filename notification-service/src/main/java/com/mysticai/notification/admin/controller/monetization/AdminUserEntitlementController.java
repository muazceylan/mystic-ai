package com.mysticai.notification.admin.controller.monetization;

import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.admin.service.monetization.AdminUserEntitlementService;
import com.mysticai.notification.admin.service.monetization.AdminUserEntitlementService.ManualGrantRequest;
import com.mysticai.notification.admin.service.monetization.AdminUserEntitlementService.ManualRevokeRequest;
import com.mysticai.notification.admin.service.monetization.AdminUserEntitlementService.UserEntitlementSnapshot;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.monetization.SubscriptionEntitlement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/v1/monetization/users")
@RequiredArgsConstructor
public class AdminUserEntitlementController {

    private final AdminUserEntitlementService service;
    private final AdminAuthService authService;

    @GetMapping("/{userId}/entitlements")
    public ResponseEntity<UserEntitlementSnapshot> get(@PathVariable Long userId) {
        return ResponseEntity.ok(service.getSnapshot(userId));
    }

    @PostMapping("/{userId}/entitlements/grant")
    public ResponseEntity<SubscriptionEntitlement> grant(@PathVariable Long userId,
                                                          @RequestBody ManualGrantRequest request,
                                                          Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        return ResponseEntity.ok(service.grant(userId, request, admin));
    }

    @PostMapping("/{userId}/entitlements/revoke")
    public ResponseEntity<SubscriptionEntitlement> revoke(@PathVariable Long userId,
                                                           @RequestBody ManualRevokeRequest request,
                                                           Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        return ResponseEntity.ok(service.revoke(userId, request, admin));
    }
}
