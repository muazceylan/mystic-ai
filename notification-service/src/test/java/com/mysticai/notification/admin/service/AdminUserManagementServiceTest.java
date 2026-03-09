package com.mysticai.notification.admin.service;

import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.repository.AdminUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserManagementServiceTest {

    @Mock AdminUserRepository adminUserRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock AuditLogService auditLogService;
    @Mock EmailDeliveryService emailDeliveryService;

    @InjectMocks AdminUserManagementService service;

    private static final Long ACTOR_ID = 1L;
    private static final String ACTOR_EMAIL = "super@mysticai.com";
    private static final AdminUser.Role ACTOR_ROLE = AdminUser.Role.SUPER_ADMIN;

    @BeforeEach
    void setUp() {
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_password");
    }

    // ── create ──────────────────────────────────────────────────────────────

    @Test
    void create_savesUser_andReturnsWithGeneratedPassword() {
        AdminUser input = AdminUser.builder().email("new@mysticai.com").role(AdminUser.Role.PRODUCT_ADMIN).build();
        AdminUser saved = AdminUser.builder().id(10L).email("new@mysticai.com").role(AdminUser.Role.PRODUCT_ADMIN).isActive(true).build();

        when(adminUserRepository.existsByEmail("new@mysticai.com")).thenReturn(false);
        when(adminUserRepository.save(any())).thenReturn(saved);

        AdminUser result = service.create(input, ACTOR_ID, ACTOR_EMAIL, ACTOR_ROLE);

        assertThat(result.getId()).isEqualTo(10L);
        assertThat(result.isActive()).isTrue();
        verify(emailDeliveryService).sendTempPassword(eq("new@mysticai.com"), anyString());
        verify(auditLogService).log(eq(ACTOR_ID), eq(ACTOR_EMAIL), eq(ACTOR_ROLE),
                eq(AuditLog.ActionType.ADMIN_USER_CREATED), any(), any(), any(), any(), any());
    }

    @Test
    void create_throwsWhenEmailAlreadyExists() {
        AdminUser input = AdminUser.builder().email("dup@mysticai.com").build();
        when(adminUserRepository.existsByEmail("dup@mysticai.com")).thenReturn(true);

        assertThatThrownBy(() -> service.create(input, ACTOR_ID, ACTOR_EMAIL, ACTOR_ROLE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email already in use");
    }

    // ── deactivate guards ────────────────────────────────────────────────────

    @Test
    void deactivate_throwsWhenActorDeactivatesOwnAccount() {
        assertThatThrownBy(() -> service.deactivate(ACTOR_ID, ACTOR_ID, ACTOR_EMAIL, ACTOR_ROLE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("own account");
    }

    @Test
    void deactivate_throwsWhenDeactivatingLastActiveSuperAdmin() {
        Long targetId = 99L;
        AdminUser superAdmin = AdminUser.builder()
                .id(targetId).email("last@mysticai.com").role(AdminUser.Role.SUPER_ADMIN).isActive(true).build();

        when(adminUserRepository.findById(targetId)).thenReturn(Optional.of(superAdmin));
        // Return only 1 active SUPER_ADMIN → cannot deactivate
        when(adminUserRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class)))
                .thenReturn(List.of(superAdmin));

        assertThatThrownBy(() -> service.deactivate(targetId, ACTOR_ID, ACTOR_EMAIL, ACTOR_ROLE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("last active SUPER_ADMIN");
    }

    @Test
    void deactivate_succeedsWhenMultipleSuperAdminsActive() {
        Long targetId = 99L;
        AdminUser target = AdminUser.builder()
                .id(targetId).email("other@mysticai.com").role(AdminUser.Role.SUPER_ADMIN).isActive(true).build();
        AdminUser another = AdminUser.builder()
                .id(2L).email("another@mysticai.com").role(AdminUser.Role.SUPER_ADMIN).isActive(true).build();

        when(adminUserRepository.findById(targetId)).thenReturn(Optional.of(target));
        when(adminUserRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class)))
                .thenReturn(List.of(target, another)); // 2 active super admins
        when(adminUserRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThatNoException().isThrownBy(
                () -> service.deactivate(targetId, ACTOR_ID, ACTOR_EMAIL, ACTOR_ROLE));
        verify(auditLogService).log(any(), any(), any(),
                eq(AuditLog.ActionType.ADMIN_USER_DEACTIVATED), any(), any(), any(), any(), any());
    }

    // ── resetPassword ────────────────────────────────────────────────────────

    @Test
    void resetPassword_returnsNewPasswordAndSendsEmail() {
        Long targetId = 5L;
        AdminUser user = AdminUser.builder().id(targetId).email("reset@mysticai.com").build();
        when(adminUserRepository.findById(targetId)).thenReturn(Optional.of(user));
        when(adminUserRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String newPw = service.resetPassword(targetId, ACTOR_ID, ACTOR_EMAIL, ACTOR_ROLE);

        assertThat(newPw).isNotBlank().startsWith("Tmp");
        verify(emailDeliveryService).sendPasswordReset(eq("reset@mysticai.com"), eq(newPw));
        verify(auditLogService).log(any(), any(), any(),
                eq(AuditLog.ActionType.ADMIN_USER_PASSWORD_RESET), any(), any(), any(), any(), any());
    }

    // ── update role change detection ─────────────────────────────────────────

    @Test
    void update_auditLogsRoleChangedWhenRoleDiffers() {
        Long targetId = 7L;
        AdminUser existing = AdminUser.builder().id(targetId).email("u@m.com")
                .role(AdminUser.Role.PRODUCT_ADMIN).build();
        AdminUser updates = AdminUser.builder().email("u@m.com").role(AdminUser.Role.NOTIFICATION_MANAGER).build();

        when(adminUserRepository.findById(targetId)).thenReturn(Optional.of(existing));
        when(adminUserRepository.existsByEmailAndIdNot("u@m.com", targetId)).thenReturn(false);
        when(adminUserRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.update(targetId, updates, ACTOR_ID, ACTOR_EMAIL, ACTOR_ROLE);

        verify(auditLogService).log(any(), any(), any(),
                eq(AuditLog.ActionType.ADMIN_USER_ROLE_CHANGED), any(), any(), any(), any(), any());
    }
}
