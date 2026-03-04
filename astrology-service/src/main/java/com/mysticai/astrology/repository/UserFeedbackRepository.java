package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.UserFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserFeedbackRepository extends JpaRepository<UserFeedback, Long> {}

