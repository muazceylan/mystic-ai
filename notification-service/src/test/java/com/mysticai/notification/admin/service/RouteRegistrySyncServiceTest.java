package com.mysticai.notification.admin.service;

import com.mysticai.notification.entity.AppRouteRegistry;
import com.mysticai.notification.repository.AppRouteRegistryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RouteRegistrySyncServiceTest {

    @Mock AppRouteRegistryRepository routeRepository;
    @Mock AuditLogService auditLogService;

    @InjectMocks RouteRegistrySyncService service;

    private RouteRegistrySyncService.ManifestEntry entry(String key, String path) {
        return new RouteRegistrySyncService.ManifestEntry(key, path, key, "home", true, "BOTH", "test");
    }

    private AppRouteRegistry registered(String key, String path) {
        return AppRouteRegistry.builder()
                .id(1L).routeKey(key).path(path)
                .syncStatus(AppRouteRegistry.SyncStatus.REGISTERED)
                .isActive(true).isDeprecated(false).isStale(false)
                .build();
    }

    // ── dry-run ──────────────────────────────────────────────────────────────

    @Test
    void dryRun_detectsNewRouteWithoutWritingToDb() {
        when(routeRepository.findAll()).thenReturn(List.of()); // empty registry

        RouteRegistrySyncService.SyncResult result = service.dryRun(List.of(entry("home", "/home")));

        assertThat(result.dryRun()).isTrue();
        assertThat(result.newRoutes()).containsExactly("home");
        assertThat(result.staleRoutes()).isEmpty();
        verify(routeRepository, never()).save(any());
    }

    @Test
    void dryRun_detectsStaleRouteWithoutWritingToDb() {
        when(routeRepository.findAll()).thenReturn(List.of(registered("old_route", "/old")));

        RouteRegistrySyncService.SyncResult result = service.dryRun(List.of(entry("new_route", "/new")));

        assertThat(result.dryRun()).isTrue();
        assertThat(result.newRoutes()).containsExactly("new_route");
        assertThat(result.staleRoutes()).containsExactly("old_route");
        verify(routeRepository, never()).save(any());
    }

    @Test
    void dryRun_detectsPathChangedRoute() {
        when(routeRepository.findAll()).thenReturn(List.of(registered("home", "/old-home")));

        RouteRegistrySyncService.SyncResult result = service.dryRun(List.of(entry("home", "/new-home")));

        assertThat(result.updatedRoutes()).anyMatch(s -> s.contains("home") && s.contains("path changed"));
        assertThat(result.staleRoutes()).isEmpty(); // same key, not stale
        verify(routeRepository, never()).save(any());
    }

    // ── apply ────────────────────────────────────────────────────────────────

    @Test
    void apply_savesNewRouteAsDiscovered() {
        when(routeRepository.findAll()).thenReturn(List.of());
        when(routeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RouteRegistrySyncService.SyncResult result = service.apply(
                List.of(entry("dream", "/dreams")), 1L, "admin@m.com", null);

        assertThat(result.dryRun()).isFalse();
        assertThat(result.newRoutes()).containsExactly("dream");
        verify(routeRepository, atLeastOnce()).save(argThat(r ->
                r instanceof AppRouteRegistry &&
                ((AppRouteRegistry) r).getSyncStatus() == AppRouteRegistry.SyncStatus.DISCOVERED));
    }

    @Test
    void apply_marksAbsentRegisteredRoutesAsStale() {
        AppRouteRegistry staleCandidate = registered("old_key", "/old");
        when(routeRepository.findAll()).thenReturn(List.of(staleCandidate));
        when(routeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.apply(List.of(entry("new_key", "/new")), 1L, "admin@m.com", null);

        assertThat(staleCandidate.isStale()).isTrue();
        assertThat(staleCandidate.getSyncStatus()).isEqualTo(AppRouteRegistry.SyncStatus.STALE);
    }

    // ── deprecated route guard ───────────────────────────────────────────────

    @Test
    void apply_doesNotReactivateDeprecatedRoutes() {
        AppRouteRegistry deprecated = AppRouteRegistry.builder()
                .id(1L).routeKey("old").path("/old")
                .isDeprecated(true).isActive(false)
                .syncStatus(AppRouteRegistry.SyncStatus.REGISTERED)
                .build();
        when(routeRepository.findAll()).thenReturn(List.of(deprecated));

        RouteRegistrySyncService.SyncResult result = service.apply(
                List.of(entry("old", "/old")), 1L, "admin@m.com", null);

        assertThat(result.conflicts()).anyMatch(c -> c.contains("deprecated"));
        // deprecated status should not be changed
        assertThat(deprecated.isDeprecated()).isTrue();
        assertThat(deprecated.isActive()).isFalse();
    }
}
