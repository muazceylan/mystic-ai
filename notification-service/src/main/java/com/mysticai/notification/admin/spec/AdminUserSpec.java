package com.mysticai.notification.admin.spec;

import com.mysticai.notification.entity.AdminUser;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class AdminUserSpec {

    public static Specification<AdminUser> filter(AdminUser.Role role, Boolean active, String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (role != null)   predicates.add(cb.equal(root.get("role"), role));
            if (active != null) predicates.add(cb.equal(root.get("isActive"), active));
            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("email")), like),
                        cb.like(cb.lower(root.get("fullName")), like)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
