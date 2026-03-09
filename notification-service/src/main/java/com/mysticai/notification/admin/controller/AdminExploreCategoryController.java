package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.service.ExploreCategoryService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.cms.ExploreCategory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/v1/explore-categories")
@RequiredArgsConstructor
public class AdminExploreCategoryController {

    private final ExploreCategoryService service;

    @GetMapping
    public ResponseEntity<Page<ExploreCategory>> list(
            @RequestParam(required = false) ExploreCategory.Status status,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String locale,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        return ResponseEntity.ok(service.findAll(status, isActive, locale,
                PageRequest.of(page, size, Sort.by("sortOrder").ascending())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExploreCategory> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<ExploreCategory> create(
            @RequestBody ExploreCategory category,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(category, adminId, adminEmail, role));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExploreCategory> update(
            @PathVariable Long id,
            @RequestBody ExploreCategory category,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.update(id, category, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<ExploreCategory> publish(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.publish(id, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<ExploreCategory> archive(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.archive(id, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<ExploreCategory> activate(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.activate(id, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<ExploreCategory> deactivate(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.deactivate(id, adminId, adminEmail, role));
    }

    @PostMapping("/reorder")
    public ResponseEntity<Void> reorder(
            @RequestBody Map<Long, Integer> orderMap,
            @RequestHeader("X-Admin-Id") Long adminId) {
        service.reorder(orderMap, adminId);
        return ResponseEntity.ok().build();
    }
}
