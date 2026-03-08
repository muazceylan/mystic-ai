package com.mysticai.notification.repository;

import com.mysticai.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    @Query("SELECT n FROM Notification n WHERE n.userId = :userId " +
           "AND (n.expiresAt IS NULL OR n.expiresAt > :now) " +
           "ORDER BY n.createdAt DESC")
    Page<Notification> findActiveByUserId(@Param("userId") Long userId,
                                          @Param("now") LocalDateTime now,
                                          Pageable pageable);

    @Query("SELECT n FROM Notification n WHERE n.userId = :userId " +
           "AND n.category = :category " +
           "AND (n.expiresAt IS NULL OR n.expiresAt > :now) " +
           "ORDER BY n.createdAt DESC")
    Page<Notification> findActiveByUserIdAndCategory(@Param("userId") Long userId,
                                                     @Param("category") Notification.NotificationCategory category,
                                                     @Param("now") LocalDateTime now,
                                                     Pageable pageable);

    List<Notification> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, Notification.NotificationStatus status);

    Optional<Notification> findByIdAndUserId(UUID id, Long userId);

    long countByUserIdAndStatus(Long userId, Notification.NotificationStatus status);

    @Modifying
    @Query("UPDATE Notification n SET n.status = 'READ', n.readAt = CURRENT_TIMESTAMP " +
           "WHERE n.userId = :userId AND n.status = 'UNREAD'")
    void markAllAsReadByUserId(@Param("userId") Long userId);

    Optional<Notification> findByCorrelationId(UUID correlationId);

    Optional<Notification> findByDedupKey(String dedupKey);

    @Query("SELECT n FROM Notification n WHERE n.userId = :userId AND n.type = :type " +
           "AND n.createdAt > :since ORDER BY n.createdAt DESC")
    List<Notification> findRecentByUserIdAndType(@Param("userId") Long userId,
                                                 @Param("type") Notification.NotificationType type,
                                                 @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.userId = :userId " +
           "AND n.pushSent = true AND n.createdAt > :since")
    long countPushSentSince(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.expiresAt IS NOT NULL AND n.expiresAt < :now")
    void deleteExpiredNotifications(@Param("now") LocalDateTime now);

    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Modifying
    @Query("UPDATE Notification n SET n.seenAt = CURRENT_TIMESTAMP " +
           "WHERE n.userId = :userId AND n.seenAt IS NULL")
    void markAllAsSeenByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE Notification n SET n.seenAt = CURRENT_TIMESTAMP " +
           "WHERE n.id = :id AND n.userId = :userId AND n.seenAt IS NULL")
    int markAsSeenById(@Param("id") UUID id, @Param("userId") Long userId);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.userId = :userId AND n.seenAt IS NULL " +
           "AND (n.expiresAt IS NULL OR n.expiresAt > :now)")
    long countUnseenByUserId(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    /** Used for re-engagement: find last notification created for a user */
    @Query("SELECT MAX(n.createdAt) FROM Notification n WHERE n.userId = :userId")
    Optional<LocalDateTime> findLastNotificationDateByUserId(@Param("userId") Long userId);

    /** Push open rate: count READ notifications with deeplink opened, last N days */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.userId = :userId " +
           "AND n.status = 'READ' AND n.readAt IS NOT NULL AND n.createdAt > :since")
    long countReadSince(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    /** Count push sent in window, for engagement rate calculation */
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.userId = :userId " +
           "AND n.pushSent = true AND n.createdAt > :since")
    long countPushSentInWindow(@Param("userId") Long userId, @Param("since") LocalDateTime since);
}
