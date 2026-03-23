package com.mysticai.notification.repository;

import com.mysticai.notification.entity.monetization.ModuleMonetizationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface ModuleMonetizationRuleRepository
        extends JpaRepository<ModuleMonetizationRule, Long>, JpaSpecificationExecutor<ModuleMonetizationRule> {

    Optional<ModuleMonetizationRule> findByModuleKeyAndConfigVersion(String moduleKey, int configVersion);

    List<ModuleMonetizationRule> findAllByConfigVersionOrderByModuleKeyAsc(int configVersion);

    List<ModuleMonetizationRule> findAllByModuleKeyOrderByConfigVersionDesc(String moduleKey);

    boolean existsByModuleKeyAndConfigVersion(String moduleKey, int configVersion);

    List<ModuleMonetizationRule> findAllByIsEnabledTrueAndConfigVersion(int configVersion);
}
