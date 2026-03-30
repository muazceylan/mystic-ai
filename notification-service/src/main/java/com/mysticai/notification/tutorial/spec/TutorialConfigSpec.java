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
            TutorialPlatform platform,
            String locale
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

            if (locale != null && !locale.isBlank()) {
                Predicate exactLocale = cb.equal(cb.lower(root.get("locale")), locale);
                Predicate localePrefix = cb.like(cb.lower(root.get("locale")), locale + "-%");
                predicates.add(cb.or(exactLocale, localePrefix));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
