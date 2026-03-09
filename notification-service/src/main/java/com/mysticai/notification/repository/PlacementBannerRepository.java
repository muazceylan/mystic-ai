package com.mysticai.notification.repository;

import com.mysticai.notification.entity.cms.PlacementBanner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PlacementBannerRepository extends JpaRepository<PlacementBanner, Long>, JpaSpecificationExecutor<PlacementBanner> {
    Optional<PlacementBanner> findByBannerKey(String bannerKey);
    boolean existsByBannerKey(String bannerKey);
    long countByStatus(PlacementBanner.Status status);
    long countByIsActiveTrue();
    long countByStatusAndStartDateBeforeAndEndDateAfter(
            PlacementBanner.Status status, LocalDateTime now1, LocalDateTime now2);
    List<PlacementBanner> findByPlacementTypeAndStatusAndIsActiveTrueAndLocaleOrderByPriorityAsc(
            PlacementBanner.PlacementType placementType, PlacementBanner.Status status, String locale);
    List<PlacementBanner> findByPlacementTypeAndStatusAndIsActiveTrueOrderByPriorityAsc(
            PlacementBanner.PlacementType placementType, PlacementBanner.Status status);
}
