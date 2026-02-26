package com.mysticai.spiritual.repository;

import com.mysticai.spiritual.entity.MeditationExercise;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MeditationExerciseRepository extends JpaRepository<MeditationExercise, Long> {
    Optional<MeditationExercise> findByIdAndActiveTrue(Long id);
    Optional<MeditationExercise> findFirstByActiveTrueOrderByIdAsc();
    List<MeditationExercise> findAllByActiveTrueOrderByIdAsc();
}
