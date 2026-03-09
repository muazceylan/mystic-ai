package com.mysticai.notification.repository;

import com.mysticai.notification.entity.cms.ExploreCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface ExploreCategoryRepository extends JpaRepository<ExploreCategory, Long>, JpaSpecificationExecutor<ExploreCategory> {
    Optional<ExploreCategory> findByCategoryKey(String categoryKey);
    boolean existsByCategoryKey(String categoryKey);
    long countByStatus(ExploreCategory.Status status);
    long countByIsActiveTrue();
    List<ExploreCategory> findByStatusAndIsActiveTrueAndLocaleOrderBySortOrderAsc(
            ExploreCategory.Status status, String locale);
    List<ExploreCategory> findByStatusAndIsActiveTrueOrderBySortOrderAsc(ExploreCategory.Status status);
}
