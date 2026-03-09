package com.mysticai.notification.admin.spec;

import com.mysticai.notification.entity.AppModule;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class AppModuleSpec {

    public static Specification<AppModule> filter(Boolean active, Boolean premium,
                                                   Boolean showOnHome, Boolean showOnExplore,
                                                   Boolean showInTabBar, Boolean maintenance) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (active != null)       predicates.add(cb.equal(root.get("isActive"), active));
            if (premium != null)      predicates.add(cb.equal(root.get("isPremium"), premium));
            if (showOnHome != null)   predicates.add(cb.equal(root.get("showOnHome"), showOnHome));
            if (showOnExplore != null) predicates.add(cb.equal(root.get("showOnExplore"), showOnExplore));
            if (showInTabBar != null) predicates.add(cb.equal(root.get("showInTabBar"), showInTabBar));
            if (maintenance != null)  predicates.add(cb.equal(root.get("maintenanceMode"), maintenance));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
