package com.mysticai.notification.repository;

import com.mysticai.notification.entity.cms.ExploreCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface ExploreCardRepository extends JpaRepository<ExploreCard, Long>, JpaSpecificationExecutor<ExploreCard> {
    Optional<ExploreCard> findByCardKey(String cardKey);
    boolean existsByCardKey(String cardKey);
    long countByStatus(ExploreCard.Status status);
    long countByIsActiveTrue();
    long countByIsFeaturedTrueAndStatus(ExploreCard.Status status);
    List<ExploreCard> findByStatusAndIsActiveTrueAndLocaleOrderBySortOrderAsc(
            ExploreCard.Status status, String locale);
    List<ExploreCard> findByStatusAndIsActiveTrueAndCategoryKeyOrderBySortOrderAsc(
            ExploreCard.Status status, String categoryKey);
    List<ExploreCard> findByStatusAndIsActiveTrueAndCategoryKeyAndLocaleOrderBySortOrderAsc(
            ExploreCard.Status status, String categoryKey, String locale);
}
