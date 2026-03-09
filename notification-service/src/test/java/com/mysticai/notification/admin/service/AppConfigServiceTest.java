package com.mysticai.notification.admin.service;

import com.mysticai.notification.entity.AppModule;
import com.mysticai.notification.entity.NavigationItem;
import com.mysticai.notification.entity.AppRouteRegistry;
import com.mysticai.notification.repository.AppModuleRepository;
import com.mysticai.notification.repository.NavigationItemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AppConfigServiceTest {

    @Mock AppModuleRepository moduleRepository;
    @Mock NavigationItemRepository navRepository;

    @InjectMocks AppConfigService service;

    private AppModule module(String key, boolean active, boolean maintenance, boolean hiddenDl) {
        return AppModule.builder()
                .moduleKey(key).displayName(key).isActive(active)
                .maintenanceMode(maintenance).hiddenButDeepLinkable(hiddenDl)
                .sortOrder(0).build();
    }

    private NavigationItem navItem(String key, boolean visible, String platform) {
        return NavigationItem.builder()
                .navKey(key).label(key).routeKey(key)
                .isVisible(visible).sortOrder(0)
                .platform(AppRouteRegistry.Platform.valueOf(platform))
                .build();
    }

    // ── config assembly ──────────────────────────────────────────────────────

    @Test
    void getConfig_returnsOnlyActiveModules() {
        when(moduleRepository.findAllByIsActiveTrueOrderBySortOrderAsc())
                .thenReturn(List.of(module("home", true, false, false)));
        when(navRepository.findAllByIsVisibleTrueOrderBySortOrderAsc()).thenReturn(List.of());

        AppConfigService.AppConfig config = service.getConfig();

        assertThat(config.activeModules()).hasSize(1);
        assertThat(config.activeModules().get(0).moduleKey()).isEqualTo("home");
    }

    @Test
    void getConfig_maintenanceFlagsIncludesMaintenanceModules() {
        AppModule normal = module("home", true, false, false);
        AppModule inMaintenance = module("dreams", true, true, false);

        when(moduleRepository.findAllByIsActiveTrueOrderBySortOrderAsc())
                .thenReturn(List.of(normal, inMaintenance));
        when(navRepository.findAllByIsVisibleTrueOrderBySortOrderAsc()).thenReturn(List.of());

        AppConfigService.AppConfig config = service.getConfig();

        assertThat(config.maintenanceFlags()).containsExactly("dreams");
        assertThat(config.maintenanceFlags()).doesNotContain("home");
    }

    @Test
    void getConfig_hiddenButDeepLinkableModulesIncludedInActiveModules() {
        // hiddenButDeepLinkable modules are returned so mobile can handle deeplinks
        AppModule hidden = module("legacy", true, false, true);
        when(moduleRepository.findAllByIsActiveTrueOrderBySortOrderAsc()).thenReturn(List.of(hidden));
        when(navRepository.findAllByIsVisibleTrueOrderBySortOrderAsc()).thenReturn(List.of());

        AppConfigService.AppConfig config = service.getConfig();

        assertThat(config.activeModules()).hasSize(1);
        assertThat(config.activeModules().get(0).hiddenButDeepLinkable()).isTrue();
    }

    @Test
    void getConfig_returnsVisibleNavItemsOnly() {
        NavigationItem visible = navItem("home", true, "BOTH");
        NavigationItem hidden = navItem("drafts", false, "BOTH");

        when(moduleRepository.findAllByIsActiveTrueOrderBySortOrderAsc()).thenReturn(List.of());
        when(navRepository.findAllByIsVisibleTrueOrderBySortOrderAsc()).thenReturn(List.of(visible));

        AppConfigService.AppConfig config = service.getConfig();

        assertThat(config.visibleTabs()).hasSize(1);
        assertThat(config.visibleTabs().get(0).navKey()).isEqualTo("home");
    }

    @Test
    void getConfig_versionIsNonBlank() {
        when(moduleRepository.findAllByIsActiveTrueOrderBySortOrderAsc()).thenReturn(List.of());
        when(navRepository.findAllByIsVisibleTrueOrderBySortOrderAsc()).thenReturn(List.of());

        AppConfigService.AppConfig config = service.getConfig();

        assertThat(config.version()).isNotBlank();
        assertThat(config.fetchedAt()).isNotNull();
    }
}
