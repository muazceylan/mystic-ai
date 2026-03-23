package com.mysticai.notification.repository;

import com.mysticai.notification.entity.monetization.MonetizationAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface MonetizationActionRepository
        extends JpaRepository<MonetizationAction, Long>, JpaSpecificationExecutor<MonetizationAction> {

    Optional<MonetizationAction> findByActionKeyAndModuleKey(String actionKey, String moduleKey);

    List<MonetizationAction> findAllByModuleKeyAndIsEnabledTrue(String moduleKey);

    List<MonetizationAction> findAllByModuleKeyOrderByDisplayPriorityAsc(String moduleKey);

    List<MonetizationAction> findAllByIsEnabledTrueOrderByModuleKeyAscDisplayPriorityAsc();

    boolean existsByActionKeyAndModuleKey(String actionKey, String moduleKey);
}
