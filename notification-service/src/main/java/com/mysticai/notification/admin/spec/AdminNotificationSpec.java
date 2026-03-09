package com.mysticai.notification.admin.spec;

import com.mysticai.notification.entity.AdminNotification;
import com.mysticai.notification.entity.Notification;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class AdminNotificationSpec {

    public static Specification<AdminNotification> filter(
            AdminNotification.Status status,
            Notification.NotificationCategory category,
            Notification.DeliveryChannel channel,
            AdminNotification.TargetAudience audience,
            LocalDateTime from,
            LocalDateTime to) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null)   predicates.add(cb.equal(root.get("status"), status));
            if (category != null) predicates.add(cb.equal(root.get("category"), category));
            if (channel != null)  predicates.add(cb.equal(root.get("deliveryChannel"), channel));
            if (audience != null) predicates.add(cb.equal(root.get("targetAudience"), audience));
            if (from != null)     predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null)       predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
