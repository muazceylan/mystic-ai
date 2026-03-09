package com.mysticai.notification.tutorial.spec;

import com.mysticai.notification.tutorial.entity.TutorialConfig;
import com.mysticai.notification.tutorial.entity.TutorialConfigStatus;
import com.mysticai.notification.tutorial.entity.TutorialPlatform;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class TutorialConfigSpec {

    private TutorialConfigSpec() {
    }

    public static Specification<TutorialConfig> filter(
            String screenKey,
            TutorialConfigStatus status,
            Boolean isActive,
            TutorialPlatform platform
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (screenKey != null && !screenKey.isBlank()) {
                predicates.add(cb.equal(root.get("screenKey"), screenKey));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (isActive != null) {
                predicates.add(cb.equal(root.get("isActive"), isActive));
            }

            if (platform != null) {
                predicates.add(cb.equal(root.get("platform"), platform));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
