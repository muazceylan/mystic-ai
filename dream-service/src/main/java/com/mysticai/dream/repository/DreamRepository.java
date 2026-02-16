package com.mysticai.dream.repository;

import com.mysticai.dream.entity.Dream;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DreamRepository extends JpaRepository<Dream, Long> {

    List<Dream> findByUserIdOrderByDreamDateDesc(Long userId);

    List<Dream> findByInterpretationStatus(Dream.InterpretationStatus status);
}
