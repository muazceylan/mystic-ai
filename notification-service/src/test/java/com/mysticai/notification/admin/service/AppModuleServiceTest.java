package com.mysticai.notification.admin.service;

import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AppModule;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.repository.AppModuleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AppModuleServiceTest {

    @Mock AppModuleRepository moduleRepository;
    @Mock AuditLogService auditLogService;

    @InjectMocks AppModuleService service;

    private static final Long ADMIN_ID = 1L;
    private static final String ADMIN_EMAIL = "admin@mysticai.com";
    private static final AdminUser.Role ROLE = AdminUser.Role.SUPER_ADMIN;

    // ── create validations ───────────────────────────────────────────────────

    @Test
    void create_throwsWhenSortOrderNegative() {
        AppModule module = AppModule.builder().moduleKey("test").sortOrder(-1).build();
        when(moduleRepository.existsByModuleKey("test")).thenReturn(false);

        assertThatThrownBy(() -> service.create(module, ADMIN_ID, ADMIN_EMAIL, ROLE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sortOrder");
    }

    @Test
    void create_throwsWhenDuplicateModuleKey() {
        AppModule module = AppModule.builder().moduleKey("home").sortOrder(0).build();
        when(moduleRepository.existsByModuleKey("home")).thenReturn(true);

        assertThatThrownBy(() -> service.create(module, ADMIN_ID, ADMIN_EMAIL, ROLE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("moduleKey already exists");
    }

    @Test
    void create_throwsWhenStartDateAfterEndDate() {
        AppModule module = AppModule.builder()
                .moduleKey("new_mod").sortOrder(0)
                .startDate(LocalDateTime.of(2026, 6, 1, 0, 0))
                .endDate(LocalDateTime.of(2026, 1, 1, 0, 0))
                .build();
        when(moduleRepository.existsByModuleKey("new_mod")).thenReturn(false);

        assertThatThrownBy(() -> service.create(module, ADMIN_ID, ADMIN_EMAIL, ROLE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("startDate cannot be after endDate");
    }

    @Test
    void create_savesAndAuditsSuccessfully() {
        AppModule module = AppModule.builder().moduleKey("karma").sortOrder(5).build();
        AppModule saved = AppModule.builder().id(10L).moduleKey("karma").sortOrder(5).build();

        when(moduleRepository.existsByModuleKey("karma")).thenReturn(false);
        when(moduleRepository.save(any())).thenReturn(saved);

        AppModule result = service.create(module, ADMIN_ID, ADMIN_EMAIL, ROLE);

        assertThat(result.getId()).isEqualTo(10L);
        verify(auditLogService).log(eq(ADMIN_ID), eq(ADMIN_EMAIL), eq(ROLE),
                eq(AuditLog.ActionType.MODULE_CREATED), any(), any(), any(), any(), any());
    }

    // ── activate / deactivate ────────────────────────────────────────────────

    @Test
    void activate_setsActiveTrueAndAudits() {
        AppModule module = AppModule.builder().id(1L).moduleKey("dreams").isActive(false).build();
        when(moduleRepository.findById(1L)).thenReturn(Optional.of(module));
        when(moduleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.activate(1L, ADMIN_ID, ADMIN_EMAIL, ROLE);

        assertThat(module.isActive()).isTrue();
        verify(auditLogService).log(any(), any(), any(), eq(AuditLog.ActionType.MODULE_ACTIVATED), any(), any(), any(), any(), any());
    }

    @Test
    void deactivate_setsActiveFalseAndAudits() {
        AppModule module = AppModule.builder().id(2L).moduleKey("dreams").isActive(true).build();
        when(moduleRepository.findById(2L)).thenReturn(Optional.of(module));
        when(moduleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.deactivate(2L, ADMIN_ID, ADMIN_EMAIL, ROLE);

        assertThat(module.isActive()).isFalse();
        verify(auditLogService).log(any(), any(), any(), eq(AuditLog.ActionType.MODULE_DEACTIVATED), any(), any(), any(), any(), any());
    }

    // ── maintenance ──────────────────────────────────────────────────────────

    @Test
    void enableMaintenance_setsMaintenanceModeTrue() {
        AppModule module = AppModule.builder().id(3L).moduleKey("spiritual").maintenanceMode(false).build();
        when(moduleRepository.findById(3L)).thenReturn(Optional.of(module));
        when(moduleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.enableMaintenance(3L, ADMIN_ID, ADMIN_EMAIL, ROLE);

        assertThat(module.isMaintenanceMode()).isTrue();
        verify(auditLogService).log(any(), any(), any(), eq(AuditLog.ActionType.MODULE_MAINTENANCE_ENABLED), any(), any(), any(), any(), any());
    }

    @Test
    void disableMaintenance_setsMaintenanceModeFalse() {
        AppModule module = AppModule.builder().id(4L).moduleKey("spiritual").maintenanceMode(true).build();
        when(moduleRepository.findById(4L)).thenReturn(Optional.of(module));
        when(moduleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.disableMaintenance(4L, ADMIN_ID, ADMIN_EMAIL, ROLE);

        assertThat(module.isMaintenanceMode()).isFalse();
        verify(auditLogService).log(any(), any(), any(), eq(AuditLog.ActionType.MODULE_MAINTENANCE_DISABLED), any(), any(), any(), any(), any());
    }

    // ── findById missing ─────────────────────────────────────────────────────

    @Test
    void findById_throwsWhenNotFound() {
        when(moduleRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Module not found");
    }
}
