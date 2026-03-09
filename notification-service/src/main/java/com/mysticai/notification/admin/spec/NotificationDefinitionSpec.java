package com.mysticai.notification.admin.spec;

import com.mysticai.notification.entity.NotificationDefinition;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class NotificationDefinitionSpec {

    public static Specification<NotificationDefinition> filter(
            NotificationDefinition.CadenceType cadenceType,
            NotificationDefinition.ChannelType channelType,
            NotificationDefinition.SourceType sourceType,
            NotificationDefinition.TriggerType triggerType,
            Boolean isActive,
            String ownerModule) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (cadenceType != null)  predicates.add(cb.equal(root.get("cadenceType"), cadenceType));
            if (channelType != null)  predicates.add(cb.equal(root.get("channelType"), channelType));
            if (sourceType != null)   predicates.add(cb.equal(root.get("sourceType"), sourceType));
            if (triggerType != null)  predicates.add(cb.equal(root.get("triggerType"), triggerType));
            if (isActive != null)     predicates.add(cb.equal(root.get("isActive"), isActive));
            if (ownerModule != null && !ownerModule.isBlank())
                predicates.add(cb.equal(root.get("ownerModule"), ownerModule));
            predicates.add(cb.isTrue(root.get("isVisibleInAdmin")));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
