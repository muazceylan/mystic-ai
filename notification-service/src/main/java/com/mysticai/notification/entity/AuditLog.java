package com.mysticai.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@EntityListeners(AuditingEntityListener.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    public enum ActionType {
        // Auth
        ADMIN_LOGIN, ADMIN_LOGOUT,
        // Notifications
        NOTIFICATION_CREATE, NOTIFICATION_UPDATE, NOTIFICATION_STATUS_CHANGE,
        NOTIFICATION_TEST_SEND, NOTIFICATION_CANCEL, NOTIFICATION_DEACTIVATE,
        NOTIFICATION_SCHEDULED, NOTIFICATION_SENT, NOTIFICATION_DISPATCH_FAILED,
        // Routes
        ROUTE_CREATE, ROUTE_UPDATE, ROUTE_DEACTIVATE, ROUTE_DEPRECATE, ROUTE_FALLBACK_CHANGE,
        ROUTE_SYNC_DRY_RUN, ROUTE_SYNC_APPLIED, ROUTE_DISCOVERED, ROUTE_MARKED_STALE,
        // Modules
        MODULE_CREATED, MODULE_UPDATED, MODULE_ACTIVATED, MODULE_DEACTIVATED,
        MODULE_MAINTENANCE_ENABLED, MODULE_MAINTENANCE_DISABLED,
        // Navigation
        NAV_CREATED, NAV_UPDATED, NAV_SHOWN, NAV_HIDDEN, NAV_REORDERED,
        // Admin users
        ADMIN_USER_CREATED, ADMIN_USER_UPDATED, ADMIN_USER_ACTIVATED,
        ADMIN_USER_DEACTIVATED, ADMIN_USER_ROLE_CHANGED, ADMIN_USER_PASSWORD_RESET,
        // Weekly horoscope CMS
        WEEKLY_HOROSCOPE_CREATED, WEEKLY_HOROSCOPE_UPDATED, WEEKLY_HOROSCOPE_PUBLISHED,
        WEEKLY_HOROSCOPE_ARCHIVED, WEEKLY_HOROSCOPE_INGESTED, WEEKLY_HOROSCOPE_OVERRIDE_SET,
        // Daily horoscope CMS
        DAILY_HOROSCOPE_CREATED, DAILY_HOROSCOPE_UPDATED, DAILY_HOROSCOPE_PUBLISHED,
        DAILY_HOROSCOPE_ARCHIVED, DAILY_HOROSCOPE_INGESTED,
        // Prayer CMS
        PRAYER_CREATED, PRAYER_UPDATED, PRAYER_PUBLISHED, PRAYER_ARCHIVED,
        PRAYER_FEATURED, PRAYER_UNFEATURED,
        // Notification Trigger Registry
        NOTIFICATION_TRIGGER_ENABLED, NOTIFICATION_TRIGGER_DISABLED,
        NOTIFICATION_TRIGGER_RUN, NOTIFICATION_TRIGGER_FAILED,
        // Notification Definition Catalog
        NOTIFICATION_DEFINITION_CREATED, NOTIFICATION_DEFINITION_UPDATED,
        // Home Sections CMS
        HOME_SECTION_CREATED, HOME_SECTION_UPDATED, HOME_SECTION_PUBLISHED,
        HOME_SECTION_ARCHIVED, HOME_SECTION_ACTIVATED, HOME_SECTION_DEACTIVATED,
        // Explore Category CMS
        EXPLORE_CATEGORY_CREATED, EXPLORE_CATEGORY_UPDATED, EXPLORE_CATEGORY_PUBLISHED,
        EXPLORE_CATEGORY_ARCHIVED, EXPLORE_CATEGORY_ACTIVATED, EXPLORE_CATEGORY_DEACTIVATED,
        // Explore Card CMS
        EXPLORE_CARD_CREATED, EXPLORE_CARD_UPDATED, EXPLORE_CARD_PUBLISHED,
        EXPLORE_CARD_ARCHIVED, EXPLORE_CARD_ACTIVATED, EXPLORE_CARD_DEACTIVATED,
        EXPLORE_CARD_FEATURED, EXPLORE_CARD_UNFEATURED,
        // Banner / Placement CMS
        BANNER_CREATED, BANNER_UPDATED, BANNER_PUBLISHED,
        BANNER_ARCHIVED, BANNER_ACTIVATED, BANNER_DEACTIVATED,
        BANNER_PRIORITY_UPDATED
    }

    public enum EntityType {
        ADMIN_USER, NOTIFICATION, ROUTE, MODULE, NAVIGATION,
        WEEKLY_HOROSCOPE, DAILY_HOROSCOPE, PRAYER,
        NOTIFICATION_TRIGGER, NOTIFICATION_DEFINITION,
        HOME_SECTION, EXPLORE_CATEGORY, EXPLORE_CARD, BANNER
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long actorAdminId;
    private String actorEmail;

    @Enumerated(EnumType.STRING)
    private AdminUser.Role actorRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(100)")
    private ActionType actionType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(60)")
    private EntityType entityType;

    private String entityId;
    private String entityDisplay;

    @Column(columnDefinition = "TEXT")
    private String oldValueJson;

    @Column(columnDefinition = "TEXT")
    private String newValueJson;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
