package com.mysticai.notification.admin.spec;

import com.mysticai.notification.entity.cms.ExploreCategory;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class ExploreCategorySpec {

    public static Specification<ExploreCategory> filter(
            ExploreCategory.Status status,
            Boolean isActive,
            String locale) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null)   predicates.add(cb.equal(root.get("status"), status));
            if (isActive != null) predicates.add(cb.equal(root.get("isActive"), isActive));
            if (locale != null && !locale.isBlank())
                                  predicates.add(cb.equal(root.get("locale"), locale));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
