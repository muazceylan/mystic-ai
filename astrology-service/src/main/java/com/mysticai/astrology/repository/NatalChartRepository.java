package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.NatalChart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query(value = """
            SELECT DISTINCT ON (user_id) *
            FROM natal_charts
            WHERE user_id IN (:userIds)
            ORDER BY user_id, calculated_at DESC
            """, nativeQuery = true)
    List<NatalChart> findLatestForUserIds(@Param("userIds") List<String> userIds);
}
