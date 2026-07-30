package com.mysticai.notification.repository;

import com.mysticai.notification.entity.monetization.GuruTokenReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface GuruTokenReservationRepository extends JpaRepository<GuruTokenReservation, UUID> {

    Optional<GuruTokenReservation> findByIdempotencyKey(String idempotencyKey);

    @Query("""
            SELECT COALESCE(SUM(r.cost), 0)
            FROM GuruTokenReservation r
            WHERE r.userId = :userId
              AND r.status = com.mysticai.notification.entity.monetization.GuruTokenReservation.Status.PENDING
              AND r.expiresAt > :now
            """)
    long sumActivePendingCost(Long userId, LocalDateTime now);
}
