package com.mysticai.notification.admin.controller;

import com.mysticai.notification.entity.AdminNotification;
import com.mysticai.notification.entity.Notification;
import com.mysticai.notification.repository.AdminNotificationRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Notification Delivery History — read-only view of admin-created notification records.
 *
 * For system-scheduler-generated notifications (per-user Notification entity),
 * runtime stats are visible via the Trigger Registry endpoint (lastRunAt, lastProducedCount).
 * This endpoint covers admin-panel-created broadcasts (AdminNotification records).
 */
@RestController
@RequestMapping("/api/admin/v1/notification-history")
@RequiredArgsConstructor
public class AdminNotificationHistoryController {

    private final AdminNotificationRepository repository;

    @GetMapping
    public ResponseEntity<Page<AdminNotification>> list(
            @RequestParam(required = false) AdminNotification.Status status,
            @RequestParam(required = false) AdminNotification.TargetAudience targetAudience,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Notification.DeliveryChannel deliveryChannel,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {

        Specification<AdminNotification> spec = buildSpec(status, targetAudience, category, deliveryChannel, from, to);
        Page<AdminNotification> result = repository.findAll(spec,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminNotification> get(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private Specification<AdminNotification> buildSpec(
            AdminNotification.Status status,
            AdminNotification.TargetAudience targetAudience,
            String category,
            Notification.DeliveryChannel deliveryChannel,
            LocalDateTime from,
            LocalDateTime to) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null)         predicates.add(cb.equal(root.get("status"), status));
            if (targetAudience != null) predicates.add(cb.equal(root.get("targetAudience"), targetAudience));
            if (category != null && !category.isBlank())
                                        predicates.add(cb.equal(root.get("category"), category));
            if (deliveryChannel != null) predicates.add(cb.equal(root.get("deliveryChannel"), deliveryChannel));
            if (from != null)           predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null)             predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
