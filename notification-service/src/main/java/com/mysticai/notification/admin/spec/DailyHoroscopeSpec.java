package com.mysticai.notification.admin.spec;

import com.mysticai.notification.entity.cms.DailyHoroscopeCms;
import com.mysticai.notification.entity.cms.WeeklyHoroscopeCms;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class DailyHoroscopeSpec {

    public static Specification<DailyHoroscopeCms> filter(
            WeeklyHoroscopeCms.ZodiacSign zodiacSign,
            DailyHoroscopeCms.Status status,
            DailyHoroscopeCms.SourceType sourceType,
            String locale,
            LocalDate dateFrom,
            LocalDate dateTo) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (zodiacSign != null) predicates.add(cb.equal(root.get("zodiacSign"), zodiacSign));
            if (status != null)     predicates.add(cb.equal(root.get("status"), status));
            if (sourceType != null) predicates.add(cb.equal(root.get("sourceType"), sourceType));
            if (locale != null)     predicates.add(cb.equal(root.get("locale"), locale));
            if (dateFrom != null)   predicates.add(cb.greaterThanOrEqualTo(root.get("date"), dateFrom));
            if (dateTo != null)     predicates.add(cb.lessThanOrEqualTo(root.get("date"), dateTo));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
