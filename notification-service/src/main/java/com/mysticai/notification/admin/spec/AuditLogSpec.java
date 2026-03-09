package com.mysticai.notification.admin.spec;

import com.mysticai.notification.entity.AuditLog;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class AuditLogSpec {

    public static Specification<AuditLog> filter(
            Long actorId,
            AuditLog.ActionType actionType,
            AuditLog.EntityType entityType,
            LocalDateTime from,
            LocalDateTime to) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (actorId != null)    predicates.add(cb.equal(root.get("actorAdminId"), actorId));
            if (actionType != null) predicates.add(cb.equal(root.get("actionType"), actionType));
            if (entityType != null) predicates.add(cb.equal(root.get("entityType"), entityType));
            if (from != null)       predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null)         predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
