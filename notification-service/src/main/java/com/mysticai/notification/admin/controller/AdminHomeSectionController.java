package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.service.HomeSectionService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.cms.HomeSection;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/v1/home-sections")
@RequiredArgsConstructor
public class AdminHomeSectionController {

    private final HomeSectionService service;

    @GetMapping
    public ResponseEntity<Page<HomeSection>> list(
            @RequestParam(required = false) HomeSection.SectionType type,
            @RequestParam(required = false) HomeSection.Status status,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String locale,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        return ResponseEntity.ok(service.findAll(type, status, isActive, locale,
                PageRequest.of(page, size, Sort.by("sortOrder").ascending())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<HomeSection> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<HomeSection> create(
            @RequestBody HomeSection section,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(section, adminId, adminEmail, role));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HomeSection> update(
            @PathVariable Long id,
            @RequestBody HomeSection section,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.update(id, section, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<HomeSection> publish(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.publish(id, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<HomeSection> archive(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.archive(id, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<HomeSection> activate(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.activate(id, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<HomeSection> deactivate(
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
