package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.service.PlacementBannerService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.cms.PlacementBanner;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/v1/banners")
@RequiredArgsConstructor
public class AdminPlacementBannerController {

    private final PlacementBannerService service;

    @GetMapping
    public ResponseEntity<Page<PlacementBanner>> list(
            @RequestParam(required = false) PlacementBanner.PlacementType placementType,
            @RequestParam(required = false) PlacementBanner.Status status,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String locale,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        return ResponseEntity.ok(service.findAll(placementType, status, isActive, locale,
                PageRequest.of(page, size, Sort.by("priority").ascending())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PlacementBanner> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<PlacementBanner> create(
            @RequestBody PlacementBanner banner,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(banner, adminId, adminEmail, role));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PlacementBanner> update(
            @PathVariable Long id,
            @RequestBody PlacementBanner banner,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.update(id, banner, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<PlacementBanner> publish(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.publish(id, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<PlacementBanner> archive(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.archive(id, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<PlacementBanner> activate(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.activate(id, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<PlacementBanner> deactivate(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.deactivate(id, adminId, adminEmail, role));
    }

    @PostMapping("/reorder")
    public ResponseEntity<Void> reorder(
            @RequestBody Map<Long, Integer> priorityMap,
            @RequestHeader("X-Admin-Id") Long adminId) {
        service.reorder(priorityMap, adminId);
        return ResponseEntity.ok().build();
    }
}
