package com.mysticai.notification.repository;

import com.mysticai.notification.entity.cms.PrayerContent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrayerContentRepository
        extends JpaRepository<PrayerContent, Long>, JpaSpecificationExecutor<PrayerContent> {

    List<PrayerContent> findByLocaleAndStatusAndIsActiveTrueOrderByIdAsc(String locale, PrayerContent.Status status);

    List<PrayerContent> findByLocaleAndStatusAndIsFeaturedTrueAndIsActiveTrueOrderByIdAsc(
            String locale, PrayerContent.Status status);

    long countByStatus(PrayerContent.Status status);

    long countByIsFeaturedTrueAndStatus(PrayerContent.Status status);
}
