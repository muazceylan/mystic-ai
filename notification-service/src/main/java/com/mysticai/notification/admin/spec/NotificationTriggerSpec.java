package com.mysticai.notification.admin.spec;

import com.mysticai.notification.entity.NotificationTrigger;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class NotificationTriggerSpec {

    public static Specification<NotificationTrigger> filter(
            NotificationTrigger.CadenceType cadenceType,
            NotificationTrigger.SourceType sourceType,
            NotificationTrigger.RunStatus lastRunStatus,
            Boolean isActive,
            String ownerModule) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (cadenceType != null)    predicates.add(cb.equal(root.get("cadenceType"), cadenceType));
            if (sourceType != null)     predicates.add(cb.equal(root.get("sourceType"), sourceType));
            if (lastRunStatus != null)  predicates.add(cb.equal(root.get("lastRunStatus"), lastRunStatus));
            if (isActive != null)       predicates.add(cb.equal(root.get("isActive"), isActive));
            if (ownerModule != null && !ownerModule.isBlank())
                predicates.add(cb.equal(root.get("ownerModule"), ownerModule));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
