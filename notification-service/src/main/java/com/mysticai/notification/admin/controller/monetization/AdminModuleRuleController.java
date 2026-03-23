package com.mysticai.notification.admin.controller.monetization;

import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.admin.service.monetization.AdminModuleRuleService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.monetization.ModuleMonetizationRule;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/v1/monetization/module-rules")
@RequiredArgsConstructor
public class AdminModuleRuleController {

    private final AdminModuleRuleService service;
    private final AdminAuthService authService;

    @GetMapping
    public ResponseEntity<Page<ModuleMonetizationRule>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.findAll(
                PageRequest.of(page, size, Sort.by("moduleKey").ascending())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ModuleMonetizationRule> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<ModuleMonetizationRule> create(@RequestBody ModuleMonetizationRule rule,
                                                          Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        return ResponseEntity.ok(service.create(rule, admin.getId(), admin.getEmail(), admin.getRole()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ModuleMonetizationRule> update(@PathVariable Long id,
                                                          @RequestBody ModuleMonetizationRule rule,
                                                          Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        return ResponseEntity.ok(service.update(id, rule, admin.getId(), admin.getEmail(), admin.getRole()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        service.delete(id, admin.getId(), admin.getEmail(), admin.getRole());
        return ResponseEntity.noContent().build();
    }
}
