package com.mysticai.notification.repository;

import com.mysticai.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    /**
     * Find all notifications for a specific user, ordered by creation date (newest first).
     */
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Find unread notifications for a specific user.
     */
    List<Notification> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, Notification.NotificationStatus status);

    /**
     * Find a specific notification by ID and user ID.
     */
    Optional<Notification> findByIdAndUserId(UUID id, Long userId);

    /**
     * Count unread notifications for a user.
     */
    long countByUserIdAndStatus(Long userId, Notification.NotificationStatus status);

    /**
     * Mark all notifications as read for a user.
     */
    @Modifying
    @Query("UPDATE Notification n SET n.status = 'READ', n.readAt = CURRENT_TIMESTAMP WHERE n.userId = :userId AND n.status = 'UNREAD'")
    void markAllAsReadByUserId(@Param("userId") Long userId);

    /**
     * Find notification by correlation ID.
     */
    Optional<Notification> findByCorrelationId(UUID correlationId);
}
