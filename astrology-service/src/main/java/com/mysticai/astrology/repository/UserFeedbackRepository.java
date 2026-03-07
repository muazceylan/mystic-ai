package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.UserFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserFeedbackRepository extends JpaRepository<UserFeedback, Long> {

    List<UserFeedback> findTop120ByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<UserFeedback> findFirstByUserIdOrderByCreatedAtDesc(Long userId);

    long countByUserId(Long userId);
}
