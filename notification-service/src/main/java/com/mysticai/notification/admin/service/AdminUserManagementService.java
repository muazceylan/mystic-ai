package com.mysticai.notification.admin.service;

import com.mysticai.notification.admin.spec.AdminUserSpec;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminUserManagementService {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final EmailDeliveryService emailDeliveryService;

    public Page<AdminUser> findAll(AdminUser.Role role, Boolean active, String search, Pageable pageable) {
        return adminUserRepository.findAll(AdminUserSpec.filter(role, active, search), pageable);
    }

    public AdminUser findById(Long id) {
        return adminUserRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found: " + id));
    }

    @Transactional
    public AdminUser create(AdminUser user, Long actorId, String actorEmail, AdminUser.Role actorRole) {
        if (adminUserRepository.existsByEmail(user.getEmail())) {
            throw new IllegalArgumentException("Email already in use: " + user.getEmail());
        }
        String tempPassword = generateTempPassword();
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setActive(true);
        AdminUser saved = adminUserRepository.save(user);

        // SECURITY: temp password is never logged in plain text.
        // It is returned once via the API response and delivered via email if enabled.
        log.info("[ADMIN-USERS] Created admin user: {}", saved.getEmail());
        emailDeliveryService.sendTempPassword(saved.getEmail(), tempPassword);
        auditLogService.log(actorId, actorEmail, actorRole,
                AuditLog.ActionType.ADMIN_USER_CREATED, AuditLog.EntityType.ADMIN_USER,
                saved.getId().toString(), saved.getEmail(), null,
                java.util.Map.of("email", saved.getEmail(), "role", saved.getRole().name()));
        return saved;
    }

    @Transactional
    public AdminUser update(Long id, AdminUser updates, Long actorId, String actorEmail, AdminUser.Role actorRole) {
        AdminUser existing = findById(id);
        if (adminUserRepository.existsByEmailAndIdNot(updates.getEmail(), id)) {
            throw new IllegalArgumentException("Email already in use: " + updates.getEmail());
        }
        AdminUser snapshot = cloneForAudit(existing);
        boolean roleChanged = existing.getRole() != updates.getRole();

        existing.setEmail(updates.getEmail());
        existing.setFullName(updates.getFullName());
        existing.setRole(updates.getRole());
        AdminUser saved = adminUserRepository.save(existing);

        AuditLog.ActionType actionType = roleChanged
                ? AuditLog.ActionType.ADMIN_USER_ROLE_CHANGED
                : AuditLog.ActionType.ADMIN_USER_UPDATED;
        auditLogService.log(actorId, actorEmail, actorRole, actionType, AuditLog.EntityType.ADMIN_USER,
                saved.getId().toString(), saved.getEmail(), snapshot, cloneForAudit(saved));
        return saved;
    }

    @Transactional
    public void activate(Long id, Long actorId, String actorEmail, AdminUser.Role actorRole) {
        AdminUser user = findById(id);
        AdminUser snapshot = cloneForAudit(user);
        user.setActive(true);
        adminUserRepository.save(user);
        auditLogService.log(actorId, actorEmail, actorRole,
                AuditLog.ActionType.ADMIN_USER_ACTIVATED, AuditLog.EntityType.ADMIN_USER,
                id.toString(), user.getEmail(), snapshot, cloneForAudit(user));
    }

    @Transactional
    public void deactivate(Long id, Long actorId, String actorEmail, AdminUser.Role actorRole) {
        if (actorId.equals(id)) {
            throw new IllegalArgumentException("Cannot deactivate your own account");
        }
        AdminUser user = findById(id);
        if (user.getRole() == AdminUser.Role.SUPER_ADMIN) {
            long activeSuperAdmins = adminUserRepository.findAll(
                    AdminUserSpec.filter(AdminUser.Role.SUPER_ADMIN, true, null)).size();
            if (activeSuperAdmins <= 1) {
                throw new IllegalArgumentException("Cannot deactivate the last active SUPER_ADMIN");
            }
        }
        AdminUser snapshot = cloneForAudit(user);
        user.setActive(false);
        adminUserRepository.save(user);
        auditLogService.log(actorId, actorEmail, actorRole,
                AuditLog.ActionType.ADMIN_USER_DEACTIVATED, AuditLog.EntityType.ADMIN_USER,
                id.toString(), user.getEmail(), snapshot, cloneForAudit(user));
    }

    /**
     * Generates a random temporary password, logs it (admin must share out-of-band),
     * and returns the plain-text password for display once.
     */
    @Transactional
    public String resetPassword(Long id, Long actorId, String actorEmail, AdminUser.Role actorRole) {
        AdminUser user = findById(id);
        String newPassword = generateTempPassword();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        adminUserRepository.save(user);
        // SECURITY: new password is never logged in plain text.
        log.info("[ADMIN-USERS] Password reset for: {} by actorId={}", user.getEmail(), actorId);
        emailDeliveryService.sendPasswordReset(user.getEmail(), newPassword);
        auditLogService.log(actorId, actorEmail, actorRole,
                AuditLog.ActionType.ADMIN_USER_PASSWORD_RESET, AuditLog.EntityType.ADMIN_USER,
                id.toString(), user.getEmail(), null, null);
        return newPassword;
    }

    /** Called on successful login to record lastLoginAt. */
    @Transactional
    public void recordLogin(Long adminId) {
        adminUserRepository.findById(adminId).ifPresent(u -> {
            u.setLastLoginAt(LocalDateTime.now());
            adminUserRepository.save(u);
        });
    }

    private String generateTempPassword() {
        String uuid = UUID.randomUUID().toString().replace("-", "");
        return "Tmp" + uuid.substring(0, 10);
    }

    private AdminUser cloneForAudit(AdminUser u) {
        return AdminUser.builder()
                .id(u.getId()).email(u.getEmail()).fullName(u.getFullName())
                .role(u.getRole()).isActive(u.isActive()).build();
    }
}
