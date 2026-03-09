package com.mysticai.notification.repository;

import com.mysticai.notification.entity.NavigationItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface NavigationItemRepository
        extends JpaRepository<NavigationItem, Long>, JpaSpecificationExecutor<NavigationItem> {

    Optional<NavigationItem> findByNavKey(String navKey);
    boolean existsByNavKey(String navKey);
    boolean existsByNavKeyAndIdNot(String navKey, Long id);
    List<NavigationItem> findAllByIsVisibleTrueOrderBySortOrderAsc();
    List<NavigationItem> findAllByOrderBySortOrderAsc();
    long countByIsVisibleTrue();
}
