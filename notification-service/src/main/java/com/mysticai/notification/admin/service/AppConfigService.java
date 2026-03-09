package com.mysticai.notification.admin.service;

import com.mysticai.notification.entity.AppModule;
import com.mysticai.notification.entity.NavigationItem;
import com.mysticai.notification.repository.AppModuleRepository;
import com.mysticai.notification.repository.NavigationItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AppConfigService {

    private final AppModuleRepository moduleRepository;
    private final NavigationItemRepository navRepository;

    public record ModuleConfig(
            String moduleKey,
            String displayName,
            String icon,
            boolean isActive,
            boolean isPremium,
            boolean showOnHome,
            boolean showOnExplore,
            boolean showInTabBar,
            int sortOrder,
            boolean maintenanceMode,
            boolean hiddenButDeepLinkable,
            String badgeLabel
    ) {}

    public record NavConfig(
            String navKey,
            String label,
            String icon,
            String routeKey,
            boolean isVisible,
            int sortOrder,
            String platform,
            boolean isPremium,
            String minAppVersion
    ) {}

    public record AppConfig(
            String version,
            LocalDateTime fetchedAt,
            List<ModuleConfig> activeModules,
            List<NavConfig> visibleTabs,
            List<String> maintenanceFlags
    ) {}

    public AppConfig getConfig() {
        List<AppModule> modules = moduleRepository.findAllByIsActiveTrueOrderBySortOrderAsc();
        List<NavigationItem> navItems = navRepository.findAllByIsVisibleTrueOrderBySortOrderAsc();

        List<ModuleConfig> moduleConfigs = modules.stream()
                .map(m -> new ModuleConfig(
                        m.getModuleKey(), m.getDisplayName(), m.getIcon(),
                        m.isActive(), m.isPremium(),
                        m.isShowOnHome(), m.isShowOnExplore(), m.isShowInTabBar(),
                        m.getSortOrder(), m.isMaintenanceMode(), m.isHiddenButDeepLinkable(),
                        m.getBadgeLabel()
                )).toList();

        // Maintenance flags are derived from the same active modules list (includes hiddenButDeepLinkable)
        List<String> maintenanceFlags = modules.stream()
                .filter(AppModule::isMaintenanceMode)
                .map(AppModule::getModuleKey)
                .toList();

        List<NavConfig> navConfigs = navItems.stream()
                .map(n -> new NavConfig(
                        n.getNavKey(), n.getLabel(), n.getIcon(), n.getRouteKey(),
                        n.isVisible(), n.getSortOrder(),
                        n.getPlatform() != null ? n.getPlatform().name() : "BOTH",
                        n.isPremium(), n.getMinAppVersion()
                )).toList();

        String version = moduleConfigs.size() + "." + navConfigs.size() + "." + maintenanceFlags.size();
        return new AppConfig(version, LocalDateTime.now(), moduleConfigs, navConfigs, maintenanceFlags);
    }
}
