package com.mysticai.notification.repository;

import com.mysticai.notification.entity.NotificationTrigger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationTriggerRepository
        extends JpaRepository<NotificationTrigger, Long>, JpaSpecificationExecutor<NotificationTrigger> {

    Optional<NotificationTrigger> findByTriggerKey(String triggerKey);

    boolean existsByTriggerKey(String triggerKey);

    long countByIsActiveTrue();

    long countByIsActiveFalse();

    long countByLastRunStatus(NotificationTrigger.RunStatus status);

    List<NotificationTrigger> findByLastRunAtAfter(LocalDateTime since);

    long countByLastRunAtAfter(LocalDateTime since);
}
