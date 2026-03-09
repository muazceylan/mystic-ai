package com.mysticai.notification.admin.controller;

import com.mysticai.notification.admin.service.AdminAuthService;
import com.mysticai.notification.admin.service.NavigationService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.NavigationItem;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/v1/navigation")
@RequiredArgsConstructor
public class AdminNavigationController {

    private final NavigationService navService;
    private final AdminAuthService authService;

    @GetMapping
    public ResponseEntity<Page<NavigationItem>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(navService.findAll(PageRequest.of(page, size, Sort.by("sortOrder"))));
    }

    @GetMapping("/visible")
    public ResponseEntity<List<NavigationItem>> visible() {
        return ResponseEntity.ok(navService.findAllVisible());
    }

    @GetMapping("/{id}")
    public ResponseEntity<NavigationItem> get(@PathVariable Long id) {
        return ResponseEntity.ok(navService.findById(id));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody NavigationItem item, Authentication auth) {
        AdminUser actor = actor(auth);
        try {
            return ResponseEntity.ok(navService.create(item, actor.getId(), actor.getEmail(), actor.getRole()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody NavigationItem updates, Authentication auth) {
        AdminUser actor = actor(auth);
        try {
            return ResponseEntity.ok(navService.update(id, updates, actor.getId(), actor.getEmail(), actor.getRole()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/show")
    public ResponseEntity<Map<String, String>> show(@PathVariable Long id, Authentication auth) {
        AdminUser actor = actor(auth);
        navService.show(id, actor.getId(), actor.getEmail(), actor.getRole());
        return ResponseEntity.ok(Map.of("message", "Navigation item shown"));
    }

    @PostMapping("/{id}/hide")
    public ResponseEntity<Map<String, String>> hide(@PathVariable Long id, Authentication auth) {
        AdminUser actor = actor(auth);
        navService.hide(id, actor.getId(), actor.getEmail(), actor.getRole());
        return ResponseEntity.ok(Map.of("message", "Navigation item hidden"));
    }

    @PostMapping("/reorder")
    public ResponseEntity<?> reorder(@RequestBody Map<Long, Integer> orderMap, Authentication auth) {
        AdminUser actor = actor(auth);
        try {
            navService.reorder(orderMap, actor.getId(), actor.getEmail(), actor.getRole());
            return ResponseEntity.ok(Map.of("message", "Navigation reordered", "count", orderMap.size()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private AdminUser actor(Authentication auth) {
        return authService.findById((Long) auth.getPrincipal());
    }
}
