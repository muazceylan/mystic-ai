package com.mysticai.notification.admin.service;

import com.mysticai.notification.entity.AdminNotification;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.AppRouteRegistry;
import com.mysticai.notification.entity.NotificationTrigger;
import com.mysticai.notification.entity.cms.*;
import com.mysticai.notification.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final AdminNotificationRepository adminNotifRepository;
    private final AuditLogRepository auditLogRepository;
    private final AppRouteRegistryRepository routeRepository;
    private final AppModuleRepository moduleRepository;
    private final NavigationItemRepository navRepository;
    private final AdminUserRepository adminUserRepository;
    private final WeeklyHoroscopeCmsRepository weeklyHoroscopeRepository;
    private final DailyHoroscopeCmsRepository dailyHoroscopeRepository;
    private final PrayerContentRepository prayerRepository;
    private final NotificationTriggerRepository triggerRepository;
    private final HomeSectionRepository homeSectionRepository;
    private final ExploreCategoryRepository exploreCategoryRepository;
    private final ExploreCardRepository exploreCardRepository;
    private final PlacementBannerRepository placementBannerRepository;

    public record DashboardSummary(
            // Notifications
            long todayCreated,
            long scheduled,
            long sent,
            long failed,
            // Routes
            long activeRoutes,
            long deprecatedRoutes,
            long discoveredUnregisteredRoutes,
            long staleRoutes,
            // Modules
            long activeModules,
            long inactiveModules,
            long maintenanceModeModules,
            // Navigation
            long visibleTabs,
            // Admin users
            long totalAdminUsers,
            // CMS — Weekly Horoscope
            long publishedWeeklyHoroscopes,
            long missingWeeklyHoroscopesThisWeek, // 12 signs - published this week
            // CMS — Daily Horoscope
            long publishedDailyHoroscopes,
            // CMS — Prayer
            long publishedPrayers,
            long featuredPrayers,
            // Trigger Monitor
            long activeTriggers,
            long disabledTriggers,
            long triggersRanLast24h,
            long failedTriggers,
            // Content CMS — Home/Explore/Banners
            long publishedHomeSections,
            long publishedExploreCategories,
            long publishedExploreCards,
            long activeBanners,
            // Recent items
            List<AuditLog> recentAuditLogs,
            List<AdminNotification> recentNotifications
    ) {}

    public DashboardSummary getSummary() {
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();

        // Current week start (Monday)
        LocalDate weekStart = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        long publishedThisWeek = weeklyHoroscopeRepository.countByWeekStartDateAndLocaleAndStatus(
                weekStart, "tr", WeeklyHoroscopeCms.Status.PUBLISHED);
        long missingThisWeek = Math.max(0, 12 - publishedThisWeek);

        return new DashboardSummary(
                // Notifications
                adminNotifRepository.countByCreatedAtAfter(startOfDay),
                adminNotifRepository.countByStatus(AdminNotification.Status.SCHEDULED),
                adminNotifRepository.countByStatus(AdminNotification.Status.SENT),
                adminNotifRepository.countByStatus(AdminNotification.Status.FAILED),
                // Routes
                routeRepository.countByIsActiveTrue(),
                routeRepository.countByIsDeprecatedTrue(),
                routeRepository.countBySyncStatus(AppRouteRegistry.SyncStatus.DISCOVERED_UNREGISTERED),
                routeRepository.countByIsStaleTrueAndIsDeprecatedFalse(),
                // Modules
                moduleRepository.countByIsActiveTrue(),
                moduleRepository.countByIsActiveFalse(),
                moduleRepository.countByMaintenanceModeTrue(),
                // Navigation
                navRepository.countByIsVisibleTrue(),
                // Admin users
                adminUserRepository.countByIsActiveTrue(),
                // CMS — Weekly
                weeklyHoroscopeRepository.countByStatus(WeeklyHoroscopeCms.Status.PUBLISHED),
                missingThisWeek,
                // CMS — Daily
                dailyHoroscopeRepository.countByStatus(DailyHoroscopeCms.Status.PUBLISHED),
                // CMS — Prayers
                prayerRepository.countByStatus(PrayerContent.Status.PUBLISHED),
                prayerRepository.countByIsFeaturedTrueAndStatus(PrayerContent.Status.PUBLISHED),
                // Trigger Monitor
                triggerRepository.countByIsActiveTrue(),
                triggerRepository.countByIsActiveFalse(),
                triggerRepository.countByLastRunAtAfter(LocalDateTime.now().minusHours(24)),
                triggerRepository.countByLastRunStatus(NotificationTrigger.RunStatus.FAILED),
                // Content CMS
                homeSectionRepository.countByStatus(HomeSection.Status.PUBLISHED),
                exploreCategoryRepository.countByStatus(ExploreCategory.Status.PUBLISHED),
                exploreCardRepository.countByStatus(ExploreCard.Status.PUBLISHED),
                placementBannerRepository.countByIsActiveTrue(),
                // Recent items
                auditLogRepository.findTop10ByOrderByCreatedAtDesc(),
                adminNotifRepository.findTop5ByOrderByCreatedAtDesc()
        );
    }
}
