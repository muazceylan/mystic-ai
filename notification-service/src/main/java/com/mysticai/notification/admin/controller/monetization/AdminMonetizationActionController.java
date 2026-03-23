package com.mysticai.notification.admin.controller.monetization;

import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.admin.service.monetization.AdminMonetizationActionService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.monetization.MonetizationAction;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/v1/monetization/actions")
@RequiredArgsConstructor
public class AdminMonetizationActionController {

    private final AdminMonetizationActionService service;
    private final AdminAuthService authService;

    @GetMapping
    public ResponseEntity<Page<MonetizationAction>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String moduleKey) {
        return ResponseEntity.ok(service.findAll(
                PageRequest.of(page, size, Sort.by("moduleKey", "displayPriority").ascending())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MonetizationAction> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<MonetizationAction> create(@RequestBody MonetizationAction action,
                                                      Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        return ResponseEntity.ok(service.create(action, admin.getId(), admin.getEmail(), admin.getRole()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MonetizationAction> update(@PathVariable Long id,
                                                      @RequestBody MonetizationAction action,
                                                      Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        return ResponseEntity.ok(service.update(id, action, admin.getId(), admin.getEmail(), admin.getRole()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        service.delete(id, admin.getId(), admin.getEmail(), admin.getRole());
        return ResponseEntity.noContent().build();
    }
}
