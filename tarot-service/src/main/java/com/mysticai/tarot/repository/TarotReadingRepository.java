package com.mysticai.tarot.repository;

import com.mysticai.tarot.entity.TarotReading;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TarotReadingRepository extends JpaRepository<TarotReading, Long> {

    List<TarotReading> findByUserIdOrderByCreatedAtDesc(String userId);

    Page<TarotReading> findByUserId(String userId, Pageable pageable);
}
