package com.mysticai.notification.admin.service;

import com.mysticai.notification.admin.security.AdminJwtService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminAuthService implements ApplicationRunner {

    private final AdminUserRepository adminUserRepository;
    private final AdminJwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final AdminUserManagementService adminUserManagementService;

    @Value("${spring.profiles.active:default}")
    private String activeProfiles;

    public record LoginResponse(String token, String email, String role, Long id) {}

    public LoginResponse login(String email, String rawPassword) {
        AdminUser admin = adminUserRepository.findByEmailAndIsActiveTrue(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!passwordEncoder.matches(rawPassword, admin.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        String token = jwtService.generateToken(admin);
        adminUserManagementService.recordLogin(admin.getId());
        auditLogService.log(admin.getId(), admin.getEmail(), admin.getRole(),
                AuditLog.ActionType.ADMIN_LOGIN, AuditLog.EntityType.ADMIN_USER,
                admin.getId().toString(), admin.getEmail(), null, null);

        return new LoginResponse(token, admin.getEmail(), admin.getRole().name(), admin.getId());
    }

    public AdminUser findById(Long id) {
        return adminUserRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));
    }

    /**
     * Seed default super admin on startup — only in dev/local/default profiles.
     * In production, create admins manually via DB or a secure setup script.
     */
    @Override
    public void run(ApplicationArguments args) {
        List<String> profiles = Arrays.asList(activeProfiles.split(","));
        boolean isDevMode = profiles.stream().anyMatch(p ->
                p.trim().equalsIgnoreCase("dev") ||
                p.trim().equalsIgnoreCase("local") ||
                p.trim().equalsIgnoreCase("default"));

        if (!isDevMode) {
            log.info("[ADMIN] Skipping admin seed — not a dev profile (active: {})", activeProfiles);
            return;
        }

        if (!adminUserRepository.existsByEmail("admin@mysticai.com")) {
            AdminUser superAdmin = AdminUser.builder()
                    .email("admin@mysticai.com")
                    .passwordHash(passwordEncoder.encode("Admin1234"))
                    .role(AdminUser.Role.SUPER_ADMIN)
                    .isActive(true)
                    .build();
            adminUserRepository.save(superAdmin);
            log.info("[ADMIN] Seeded default super admin: admin@mysticai.com / Admin1234");
        }
    }
}
