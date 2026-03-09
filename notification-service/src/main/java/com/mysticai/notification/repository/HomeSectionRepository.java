package com.mysticai.notification.repository;

import com.mysticai.notification.entity.cms.HomeSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface HomeSectionRepository extends JpaRepository<HomeSection, Long>, JpaSpecificationExecutor<HomeSection> {
    Optional<HomeSection> findBySectionKey(String sectionKey);
    boolean existsBySectionKey(String sectionKey);
    long countByStatus(HomeSection.Status status);
    long countByIsActiveTrue();
    List<HomeSection> findByStatusAndIsActiveTrueAndLocaleOrderBySortOrderAsc(
            HomeSection.Status status, String locale);
    List<HomeSection> findByStatusAndIsActiveTrueOrderBySortOrderAsc(HomeSection.Status status);
}
