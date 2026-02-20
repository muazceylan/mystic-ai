package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.DreamSymbol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DreamSymbolRepository extends JpaRepository<DreamSymbol, Long> {

    Optional<DreamSymbol> findByUserIdAndSymbolName(Long userId, String symbolName);

    List<DreamSymbol> findAllByUserIdOrderByCountDesc(Long userId);

    List<DreamSymbol> findTop10ByUserIdOrderByCountDesc(Long userId);

    /**
     * Collective pulse: top N symbols across ALL users seen since the given date.
     * Returns [symbolName, totalCount] pairs ordered by totalCount desc.
     */
    @Query("""
           SELECT ds.symbolName, SUM(ds.count) AS total
           FROM DreamSymbol ds
           WHERE ds.lastSeenDate >= :since
           GROUP BY ds.symbolName
           ORDER BY total DESC
           LIMIT :limit
           """)
    List<Object[]> findGlobalTopSymbolsSince(@Param("since") LocalDate since, @Param("limit") int limit);
}
