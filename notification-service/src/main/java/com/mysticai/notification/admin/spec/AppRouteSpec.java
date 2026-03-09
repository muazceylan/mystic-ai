package com.mysticai.notification.admin.spec;

import com.mysticai.notification.entity.AppRouteRegistry;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class AppRouteSpec {

    public static Specification<AppRouteRegistry> filter(
            Boolean active,
            Boolean deprecated,
            String moduleKey,
            AppRouteRegistry.Platform platform) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (active != null)     predicates.add(cb.equal(root.get("active"), active));
            if (deprecated != null) predicates.add(cb.equal(root.get("deprecated"), deprecated));
            if (moduleKey != null)  predicates.add(cb.equal(root.get("moduleKey"), moduleKey));
            if (platform != null)   predicates.add(cb.equal(root.get("supportedPlatforms"), platform));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
