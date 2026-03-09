package com.mysticai.notification.repository;

import com.mysticai.notification.entity.AppModule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface AppModuleRepository
        extends JpaRepository<AppModule, Long>, JpaSpecificationExecutor<AppModule> {

    Optional<AppModule> findByModuleKey(String moduleKey);
    boolean existsByModuleKey(String moduleKey);
    boolean existsByModuleKeyAndIdNot(String moduleKey, Long id);
    List<AppModule> findAllByIsActiveTrueOrderBySortOrderAsc();
    long countByIsActiveTrue();
    long countByIsActiveFalse();
    long countByMaintenanceModeTrue();
}
