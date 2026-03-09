package com.mysticai.notification.admin.spec;

import com.mysticai.notification.entity.cms.PrayerContent;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class PrayerContentSpec {

    public static Specification<PrayerContent> filter(
            PrayerContent.Status status,
            PrayerContent.Category category,
            PrayerContent.ContentType contentType,
            String locale,
            Boolean isFeatured,
            Boolean isPremium) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null)      predicates.add(cb.equal(root.get("status"), status));
            if (category != null)    predicates.add(cb.equal(root.get("category"), category));
            if (contentType != null) predicates.add(cb.equal(root.get("contentType"), contentType));
            if (locale != null)      predicates.add(cb.equal(root.get("locale"), locale));
            if (isFeatured != null)  predicates.add(cb.equal(root.get("isFeatured"), isFeatured));
            if (isPremium != null)   predicates.add(cb.equal(root.get("isPremium"), isPremium));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
