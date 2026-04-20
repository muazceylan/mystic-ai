package com.mysticai.auth.repository;

import com.mysticai.auth.entity.User;
import com.mysticai.auth.entity.enums.SignupBonusSyncStatus;
import com.mysticai.auth.entity.enums.UserType;
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

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByUsernameIgnoreCase(String username);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    Optional<User> findByProviderAndSocialId(String provider, String socialId);

    Page<User> findByEmailContainingIgnoreCaseOrNameContainingIgnoreCase(
            String email, String name, Pageable pageable);

    @Query("""
            SELECT u
            FROM User u
            WHERE (:userType IS NULL OR u.userType = :userType)
              AND (:idsEmpty = true OR u.id IN :ids)
              AND (
                :q = ''
                OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(u.name, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<User> adminSearch(
            @Param("q") String q,
            @Param("userType") UserType userType,
            @Param("ids") List<Long> ids,
            @Param("idsEmpty") boolean idsEmpty,
            Pageable pageable
    );

    long countByUserType(UserType userType);

    long countByEmailVerifiedAtIsNotNull();

    @Query("SELECT COUNT(u) FROM User u WHERE u.userType = :userType AND u.updatedAt < :cutoff")
    long countStaleGuests(@Param("userType") UserType userType, @Param("cutoff") LocalDateTime cutoff);

    @Modifying
    @Query("DELETE FROM User u WHERE u.userType = :userType AND u.updatedAt < :cutoff")
    int deleteStaleGuests(@Param("userType") UserType userType, @Param("cutoff") LocalDateTime cutoff);

    @Query("SELECT COUNT(u) FROM User u WHERE u.isAccountLinked = true AND u.updatedAt >= :since")
    long countLinkedAccountsSince(@Param("since") LocalDateTime since);

    @Query("""
            SELECT u.id
            FROM User u
            WHERE u.signupBonusSyncStatus = :status
              AND u.signupBonusGrantedAt IS NULL
              AND u.signupBonusRegistrationSource IS NOT NULL
              AND (
                u.signupBonusNextRetryAt IS NULL
                OR u.signupBonusNextRetryAt <= :now
              )
            ORDER BY COALESCE(u.signupBonusNextRetryAt, u.createdAt), u.id
            """)
    List<Long> findSignupBonusRetryCandidateIds(@Param("status") SignupBonusSyncStatus status,
                                                @Param("now") LocalDateTime now,
                                                Pageable pageable);
}
