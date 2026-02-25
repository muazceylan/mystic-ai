package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.StarMateMatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StarMateMatchRepository extends JpaRepository<StarMateMatch, Long> {

    Optional<StarMateMatch> findByUserAIdAndUserBId(Long userAId, Long userBId);

    @Query("""
            select m
            from StarMateMatch m
            where (m.userAId = :userId or m.userBId = :userId)
              and m.isBlocked = false
            order by m.updatedAt desc
            """)
    List<StarMateMatch> findActiveByUserId(@Param("userId") Long userId);
}
