package com.mysticai.notification.repository;

import com.mysticai.notification.entity.AdminNotification;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AdminNotificationRepository
        extends JpaRepository<AdminNotification, Long>, JpaSpecificationExecutor<AdminNotification> {

    long countByCreatedAtAfter(LocalDateTime since);
    long countByStatus(AdminNotification.Status status);
    List<AdminNotification> findTop5ByOrderByCreatedAtDesc();

    /** Returns notifications that are due and not yet dispatched. Uses lightweight query (no lock) for batch scanning. */
    @Query("SELECT n FROM AdminNotification n WHERE n.status = 'SCHEDULED' AND n.scheduledAt <= :now AND n.isActive = true")
    List<AdminNotification> findDueForDispatch(@Param("now") LocalDateTime now);

    /** Fetch a single notification with a pessimistic write lock to prevent concurrent dispatch. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT n FROM AdminNotification n WHERE n.id = :id")
    Optional<AdminNotification> findByIdForUpdate(@Param("id") Long id);
}
