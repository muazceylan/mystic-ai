package com.mysticai.auth.repository.token;

import com.mysticai.auth.entity.token.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    Optional<PasswordResetToken> findTopByUserIdOrderByCreatedAtDesc(Long userId);

    long countByUserIdAndCreatedAtAfter(Long userId, LocalDateTime createdAfter);

    @Modifying
    @Query("""
            update PasswordResetToken t
               set t.usedAt = :now,
                   t.revokedAt = :now
             where t.tokenHash = :tokenHash
               and t.usedAt is null
               and t.revokedAt is null
               and t.expiresAt > :now
            """)
    int consumeTokenIfValid(@Param("tokenHash") String tokenHash, @Param("now") LocalDateTime now);

    @Modifying
    @Query("""
            update PasswordResetToken t
               set t.revokedAt = :revokedAt
             where t.user.id = :userId
               and t.usedAt is null
               and t.revokedAt is null
            """)
    int revokeActiveTokensByUserId(@Param("userId") Long userId, @Param("revokedAt") LocalDateTime revokedAt);
}
