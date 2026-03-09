package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.service.ExploreCardService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.cms.ExploreCard;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/v1/explore-cards")
@RequiredArgsConstructor
public class AdminExploreCardController {

    private final ExploreCardService service;

    @GetMapping
    public ResponseEntity<Page<ExploreCard>> list(
            @RequestParam(required = false) String categoryKey,
            @RequestParam(required = false) ExploreCard.Status status,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Boolean isFeatured,
            @RequestParam(required = false) Boolean isPremium,
            @RequestParam(required = false) String locale,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        return ResponseEntity.ok(service.findAll(categoryKey, status, isActive, isFeatured, isPremium, locale,
                PageRequest.of(page, size, Sort.by("sortOrder").ascending())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExploreCard> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<ExploreCard> create(
            @RequestBody ExploreCard card,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(card, adminId, adminEmail, role));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExploreCard> update(
            @PathVariable Long id,
            @RequestBody ExploreCard card,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.update(id, card, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<ExploreCard> publish(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.publish(id, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<ExploreCard> archive(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.archive(id, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<ExploreCard> activate(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.activate(id, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<ExploreCard> deactivate(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.deactivate(id, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/feature")
    public ResponseEntity<ExploreCard> feature(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.feature(id, adminId, adminEmail, role));
    }

    @PostMapping("/{id}/unfeature")
    public ResponseEntity<ExploreCard> unfeature(
            @PathVariable Long id,
            @RequestHeader("X-Admin-Id") Long adminId,
            @RequestHeader("X-Admin-Email") String adminEmail,
            @RequestHeader("X-Admin-Role") AdminUser.Role role) {
        return ResponseEntity.ok(service.unfeature(id, adminId, adminEmail, role));
    }

    @PostMapping("/reorder")
    public ResponseEntity<Void> reorder(
            @RequestBody Map<Long, Integer> orderMap,
            @RequestHeader("X-Admin-Id") Long adminId) {
        service.reorder(orderMap, adminId);
        return ResponseEntity.ok().build();
    }
}
