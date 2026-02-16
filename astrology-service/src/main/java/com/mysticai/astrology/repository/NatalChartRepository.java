package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.NatalChart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for NatalChart entity.
 */
@Repository
public interface NatalChartRepository extends JpaRepository<NatalChart, Long> {

    Optional<NatalChart> findByUserId(String userId);

    List<NatalChart> findAllByUserId(String userId);

    Optional<NatalChart> findFirstByUserIdOrderByCalculatedAtDesc(String userId);

    boolean existsByUserId(String userId);
}
