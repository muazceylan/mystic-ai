package com.mysticai.auth.repository;

import com.mysticai.auth.entity.User;
import com.mysticai.auth.entity.enums.UserType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
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

    long countByUserType(UserType userType);

    @Query("SELECT COUNT(u) FROM User u WHERE u.userType = :userType AND u.updatedAt < :cutoff")
    long countStaleGuests(@Param("userType") UserType userType, @Param("cutoff") LocalDateTime cutoff);

    @Modifying
    @Query("DELETE FROM User u WHERE u.userType = :userType AND u.updatedAt < :cutoff")
    int deleteStaleGuests(@Param("userType") UserType userType, @Param("cutoff") LocalDateTime cutoff);

    @Query("SELECT COUNT(u) FROM User u WHERE u.isAccountLinked = true AND u.updatedAt >= :since")
    long countLinkedAccountsSince(@Param("since") LocalDateTime since);
}
