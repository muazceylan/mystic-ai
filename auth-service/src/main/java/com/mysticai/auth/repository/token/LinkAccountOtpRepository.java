package com.mysticai.auth.repository.token;

import com.mysticai.auth.entity.token.LinkAccountOtpToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface LinkAccountOtpRepository extends JpaRepository<LinkAccountOtpToken, Long> {

    Optional<LinkAccountOtpToken> findTopByUserIdOrderByCreatedAtDesc(Long userId);

    @Modifying
    @Query("DELETE FROM LinkAccountOtpToken t WHERE t.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);
}
