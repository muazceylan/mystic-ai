package com.mysticai.notification.admin.spec;

import com.mysticai.notification.entity.cms.WeeklyHoroscopeCms;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class WeeklyHoroscopeSpec {

    public static Specification<WeeklyHoroscopeCms> filter(
            WeeklyHoroscopeCms.ZodiacSign zodiacSign,
            WeeklyHoroscopeCms.Status status,
            WeeklyHoroscopeCms.SourceType sourceType,
            String locale,
            LocalDate weekStartFrom,
            LocalDate weekStartTo) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (zodiacSign != null)    predicates.add(cb.equal(root.get("zodiacSign"), zodiacSign));
            if (status != null)        predicates.add(cb.equal(root.get("status"), status));
            if (sourceType != null)    predicates.add(cb.equal(root.get("sourceType"), sourceType));
            if (locale != null)        predicates.add(cb.equal(root.get("locale"), locale));
            if (weekStartFrom != null) predicates.add(cb.greaterThanOrEqualTo(root.get("weekStartDate"), weekStartFrom));
            if (weekStartTo != null)   predicates.add(cb.lessThanOrEqualTo(root.get("weekStartDate"), weekStartTo));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
