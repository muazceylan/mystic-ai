package com.mysticai.notification.repository;

import com.mysticai.notification.entity.AppRouteRegistry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface AppRouteRegistryRepository
        extends JpaRepository<AppRouteRegistry, Long>, JpaSpecificationExecutor<AppRouteRegistry> {

    Optional<AppRouteRegistry> findByRouteKey(String routeKey);
    boolean existsByRouteKey(String routeKey);
    boolean existsByRouteKeyAndIdNot(String routeKey, Long id);

    List<AppRouteRegistry> findAllByIsActiveTrue();
    List<AppRouteRegistry> findAllByIsActiveTrueAndIsDeprecatedFalse();
    List<AppRouteRegistry> findAllBySyncStatus(AppRouteRegistry.SyncStatus syncStatus);
    List<AppRouteRegistry> findAllByIsStaleTrue();

    long countByIsActiveTrue();
    long countByIsDeprecatedTrue();
    long countBySyncStatus(AppRouteRegistry.SyncStatus syncStatus);
    long countByIsStaleTrueAndIsDeprecatedFalse();
}
