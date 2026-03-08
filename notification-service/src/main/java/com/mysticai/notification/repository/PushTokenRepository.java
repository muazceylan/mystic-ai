package com.mysticai.notification.repository;

import com.mysticai.notification.entity.PushToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PushTokenRepository extends JpaRepository<PushToken, Long> {

    List<PushToken> findAllByUserIdAndActiveTrue(Long userId);

    Optional<PushToken> findByToken(String token);

    @Modifying
    @Query("UPDATE PushToken t SET t.active = false WHERE t.token = :token")
    void deactivateByToken(@Param("token") String token);

    @Modifying
    @Query("DELETE FROM PushToken t WHERE t.active = false AND t.updatedAt < :before")
    void deleteInactiveOlderThan(@Param("before") LocalDateTime before);

    List<PushToken> findAllByActiveTrue();
}
