package com.mysticai.notification.admin.spec;

import com.mysticai.notification.entity.cms.HomeSection;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class HomeSectionSpec {

    public static Specification<HomeSection> filter(
            HomeSection.SectionType type,
            HomeSection.Status status,
            Boolean isActive,
            String locale) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (type != null)     predicates.add(cb.equal(root.get("type"), type));
            if (status != null)   predicates.add(cb.equal(root.get("status"), status));
            if (isActive != null) predicates.add(cb.equal(root.get("isActive"), isActive));
            if (locale != null && !locale.isBlank())
                                  predicates.add(cb.equal(root.get("locale"), locale));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
