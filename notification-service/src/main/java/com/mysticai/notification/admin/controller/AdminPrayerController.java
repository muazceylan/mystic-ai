package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.admin.service.cms.PrayerContentService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.cms.PrayerContent;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/v1/prayers")
@RequiredArgsConstructor
public class AdminPrayerController {

    private final PrayerContentService service;
    private final AdminAuthService authService;

    @GetMapping
    public ResponseEntity<Page<PrayerContent>> list(
            @RequestParam(required = false) PrayerContent.Status status,
            @RequestParam(required = false) PrayerContent.Category category,
            @RequestParam(required = false) PrayerContent.ContentType contentType,
            @RequestParam(required = false) String locale,
            @RequestParam(required = false) Boolean isFeatured,
            @RequestParam(required = false) Boolean isPremium,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.findAll(status, category, contentType, locale, isFeatured, isPremium,
                PageRequest.of(page, size, Sort.by("id").ascending())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PrayerContent> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<PrayerContent> create(@RequestBody PrayerContent data, Authentication auth) {
        AdminUser admin = adminUser(auth);
        try {
            return ResponseEntity.ok(service.create(data, admin.getId(), admin.getEmail(), admin.getRole()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<PrayerContent> update(@PathVariable Long id,
                                                 @RequestBody PrayerContent updates,
                                                 Authentication auth) {
        AdminUser admin = adminUser(auth);
        try {
            return ResponseEntity.ok(service.update(id, updates, admin.getId(), admin.getEmail(), admin.getRole()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<PrayerContent> publish(@PathVariable Long id, Authentication auth) {
        AdminUser admin = adminUser(auth);
        try {
            return ResponseEntity.ok(service.publish(id, admin.getId(), admin.getEmail(), admin.getRole()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<PrayerContent> archive(@PathVariable Long id, Authentication auth) {
        AdminUser admin = adminUser(auth);
        return ResponseEntity.ok(service.archive(id, admin.getId(), admin.getEmail(), admin.getRole()));
    }

    @PostMapping("/{id}/feature")
    public ResponseEntity<PrayerContent> feature(@PathVariable Long id,
                                                  @RequestBody Map<String, Boolean> body,
                                                  Authentication auth) {
        AdminUser admin = adminUser(auth);
        boolean featured = Boolean.TRUE.equals(body.get("featured"));
        return ResponseEntity.ok(service.setFeatured(id, featured, admin.getId(), admin.getEmail(), admin.getRole()));
    }

    private AdminUser adminUser(Authentication auth) {
        return authService.findById((Long) auth.getPrincipal());
    }
}
