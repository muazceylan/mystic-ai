package com.mysticai.notification.admin.spec;

import com.mysticai.notification.entity.cms.ExploreCard;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class ExploreCardSpec {

    public static Specification<ExploreCard> filter(
            String categoryKey,
            ExploreCard.Status status,
            Boolean isActive,
            Boolean isFeatured,
            Boolean isPremium,
            String locale) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (categoryKey != null && !categoryKey.isBlank())
                                  predicates.add(cb.equal(root.get("categoryKey"), categoryKey));
            if (status != null)   predicates.add(cb.equal(root.get("status"), status));
            if (isActive != null) predicates.add(cb.equal(root.get("isActive"), isActive));
            if (isFeatured != null) predicates.add(cb.equal(root.get("isFeatured"), isFeatured));
            if (isPremium != null) predicates.add(cb.equal(root.get("isPremium"), isPremium));
            if (locale != null && !locale.isBlank())
                                  predicates.add(cb.equal(root.get("locale"), locale));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
