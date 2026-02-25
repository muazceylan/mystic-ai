package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.StarMateProfile;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StarMateProfileRepository extends JpaRepository<StarMateProfile, Long> {

    Optional<StarMateProfile> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    List<StarMateProfile> findAllByUserIdIn(List<Long> userIds);

    List<StarMateProfile> findAllByIsActiveTrueAndUserIdNot(Long userId);

    @Query("""
            select p
            from StarMateProfile p
            where p.isActive = true
              and p.userId <> :viewerUserId
              and p.birthDate between :oldestBirthDate and :youngestBirthDate
              and p.latitude is not null
              and p.longitude is not null
            """)
    List<StarMateProfile> findDiscoveryCandidatePool(
            @Param("viewerUserId") Long viewerUserId,
            @Param("oldestBirthDate") LocalDate oldestBirthDate,
            @Param("youngestBirthDate") LocalDate youngestBirthDate,
            Pageable pageable
    );
}
