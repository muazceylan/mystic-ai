package com.mysticai.notification.repository;

import com.mysticai.notification.entity.NotificationDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotificationDefinitionRepository
        extends JpaRepository<NotificationDefinition, Long>, JpaSpecificationExecutor<NotificationDefinition> {

    Optional<NotificationDefinition> findByDefinitionKey(String definitionKey);

    boolean existsByDefinitionKey(String definitionKey);

    long countByIsActiveTrue();

    long countByIsActiveFalse();

    long countBySourceType(NotificationDefinition.SourceType sourceType);
}
