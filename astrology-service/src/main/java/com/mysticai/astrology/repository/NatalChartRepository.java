package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.NatalChart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NatalChartRepository extends JpaRepository<NatalChart, Long> {

    List<NatalChart> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<NatalChart> findFirstByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByUserId(Long userId);
}
