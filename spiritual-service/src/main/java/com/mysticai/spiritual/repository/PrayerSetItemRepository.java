package com.mysticai.spiritual.repository;

import com.mysticai.spiritual.entity.PrayerSetItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface PrayerSetItemRepository extends JpaRepository<PrayerSetItem, Long> {
    List<PrayerSetItem> findAllByPrayerSetIdOrderByDisplayOrderAsc(Long prayerSetId);
    List<PrayerSetItem> findAllByPrayerSetIdIn(Collection<Long> prayerSetIds);
}

