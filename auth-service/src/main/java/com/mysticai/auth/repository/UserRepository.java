package com.mysticai.auth.repository;

import com.mysticai.auth.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

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
}
