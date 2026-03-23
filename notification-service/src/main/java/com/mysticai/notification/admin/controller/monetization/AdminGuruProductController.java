package com.mysticai.notification.admin.controller.monetization;

import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.admin.service.monetization.AdminGuruProductService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.monetization.GuruProductCatalog;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/v1/monetization/guru-products")
@RequiredArgsConstructor
public class AdminGuruProductController {

    private final AdminGuruProductService service;
    private final AdminAuthService authService;

    @GetMapping
    public ResponseEntity<Page<GuruProductCatalog>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.findAll(
                PageRequest.of(page, size, Sort.by("sortOrder").ascending())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GuruProductCatalog> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<GuruProductCatalog> create(@RequestBody GuruProductCatalog product,
                                                      Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        return ResponseEntity.ok(service.create(product, admin.getId(), admin.getEmail(), admin.getRole()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GuruProductCatalog> update(@PathVariable Long id,
                                                      @RequestBody GuruProductCatalog product,
                                                      Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        return ResponseEntity.ok(service.update(id, product, admin.getId(), admin.getEmail(), admin.getRole()));
    }

    @PostMapping("/{id}/enable")
    public ResponseEntity<GuruProductCatalog> enable(@PathVariable Long id, Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        return ResponseEntity.ok(service.enable(id, admin.getId(), admin.getEmail(), admin.getRole()));
    }

    @PostMapping("/{id}/disable")
    public ResponseEntity<GuruProductCatalog> disable(@PathVariable Long id, Authentication auth) {
        AdminUser admin = authService.findById((Long) auth.getPrincipal());
        return ResponseEntity.ok(service.disable(id, admin.getId(), admin.getEmail(), admin.getRole()));
    }
}
