package com.mysticai.spiritual.repository;

import com.mysticai.spiritual.entity.Prayer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PrayerRepository extends JpaRepository<Prayer, Long> {
    Optional<Prayer> findByIdAndActiveTrue(Long id);
    List<Prayer> findTop50ByActiveTrueOrderByIdAsc();
    List<Prayer> findAllByActiveTrueOrderByIdAsc();
    List<Prayer> findAllByActiveTrueAndCategoryIgnoreCaseOrderByIdAsc(String category);
}
