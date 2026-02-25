package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.StarMatePreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StarMatePreferenceRepository extends JpaRepository<StarMatePreference, Long> {
    Optional<StarMatePreference> findByUserId(Long userId);
}
