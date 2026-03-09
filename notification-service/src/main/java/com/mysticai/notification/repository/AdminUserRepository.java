package com.mysticai.notification.repository;

import com.mysticai.notification.entity.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface AdminUserRepository
        extends JpaRepository<AdminUser, Long>, JpaSpecificationExecutor<AdminUser> {

    Optional<AdminUser> findByEmailAndIsActiveTrue(String email);
    Optional<AdminUser> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByEmailAndIdNot(String email, Long id);
    long countByRole(AdminUser.Role role);
    long countByIsActiveTrue();
}
