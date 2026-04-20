package com.mysticai.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductAnalyticsService {

    private static final int MIN_WINDOW_DAYS = 1;
    private static final int MAX_WINDOW_DAYS = 90;
    private static final int DEFAULT_TOP_SCREENS_LIMIT = 8;
    private static final int MAX_TOP_SCREENS_LIMIT = 20;

    private final JdbcTemplate jdbc;

    public record ScreenViewPayload(
            String screenKey,
            String routePath,
            String platform,
            String sessionId
    ) {}

    public record TopScreen(
            String screenKey,
            String routePath,
            long visits,
            long uniqueUsers,
            LocalDateTime lastSeenAt
    ) {}

    public record AnalyticsOverview(
            int windowDays,
            int activeWithinDays,
            long trackedScreenViews,
            long screenViewsToday,
            long trackedUsers,
            long activeUsers,
            LocalDateTime latestTrackedAt,
            List<TopScreen> topScreens
    ) {}

    public record ActiveUserActivity(
            Long userId,
            long screenViews,
            LocalDateTime screenLastSeenAt,
            LocalDateTime pushLastSeenAt,
            LocalDateTime lastActiveAt
    ) {}

    public void recordScreenView(Long userId, ScreenViewPayload payload) {
        String screenKey = sanitize(payload.screenKey(), 120);
        if (screenKey == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        jdbc.update(
                """
                INSERT INTO app_screen_views (
                    user_id,
                    screen_key,
                    route_path,
                    platform,
                    session_id,
                    seen_at,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                userId,
                screenKey,
                sanitize(payload.routePath(), 255),
                sanitize(payload.platform(), 20),
                sanitize(payload.sessionId(), 120),
                Timestamp.valueOf(now),
                Timestamp.valueOf(now)
        );
    }

    public AnalyticsOverview getOverview(int windowDays, int activeWithinDays, int topScreensLimit) {
        int safeWindowDays = clamp(windowDays, MIN_WINDOW_DAYS, MAX_WINDOW_DAYS);
        int safeActiveWithinDays = clamp(activeWithinDays, MIN_WINDOW_DAYS, MAX_WINDOW_DAYS);
        int safeTopScreensLimit = clamp(topScreensLimit, 1, MAX_TOP_SCREENS_LIMIT);

        LocalDateTime windowSince = LocalDateTime.now().minusDays(safeWindowDays);
        LocalDateTime activeSince = LocalDateTime.now().minusDays(safeActiveWithinDays);
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();

        long trackedScreenViews = queryForLong(
                "SELECT COUNT(*) FROM app_screen_views WHERE seen_at >= ?",
                Timestamp.valueOf(windowSince)
        );
        long screenViewsToday = queryForLong(
                "SELECT COUNT(*) FROM app_screen_views WHERE seen_at >= ?",
                Timestamp.valueOf(startOfDay)
        );
        long trackedUsers = queryForLong(
                """
                SELECT COUNT(DISTINCT user_id)
                FROM app_screen_views
                WHERE user_id IS NOT NULL AND seen_at >= ?
                """,
                Timestamp.valueOf(windowSince)
        );
        long activeUsers = queryForLong(
                """
                SELECT COUNT(*)
                FROM (
                    SELECT user_id
                    FROM app_screen_views
                    WHERE user_id IS NOT NULL AND seen_at >= ?
                    GROUP BY user_id
                    UNION
                    SELECT user_id
                    FROM push_tokens
                    WHERE is_active = true AND last_seen_at >= ?
                    GROUP BY user_id
                ) active_users
                """,
                Timestamp.valueOf(activeSince),
                Timestamp.valueOf(activeSince)
        );

        LocalDateTime latestTrackedAt = queryForDateTime(
                "SELECT MAX(seen_at) FROM app_screen_views"
        );

        List<TopScreen> topScreens = jdbc.query(
                """
                SELECT
                    screen_key,
                    MAX(COALESCE(NULLIF(route_path, ''), screen_key)) AS route_path,
                    COUNT(*) AS visits,
                    COUNT(DISTINCT user_id) AS unique_users,
                    MAX(seen_at) AS last_seen_at
                FROM app_screen_views
                WHERE seen_at >= ?
                GROUP BY screen_key
                ORDER BY visits DESC, last_seen_at DESC
                LIMIT ?
                """,
                (rs, rowNum) -> new TopScreen(
                        rs.getString("screen_key"),
                        rs.getString("route_path"),
                        rs.getLong("visits"),
                        rs.getLong("unique_users"),
                        toLocalDateTime(rs, "last_seen_at")
                ),
                Timestamp.valueOf(windowSince),
                safeTopScreensLimit
        );

        return new AnalyticsOverview(
                safeWindowDays,
                safeActiveWithinDays,
                trackedScreenViews,
                screenViewsToday,
                trackedUsers,
                activeUsers,
                latestTrackedAt,
                topScreens
        );
    }

    public Page<ActiveUserActivity> getActiveUsers(int withinDays, Pageable pageable) {
        int safeWithinDays = clamp(withinDays, MIN_WINDOW_DAYS, MAX_WINDOW_DAYS);
        LocalDateTime activeSince = LocalDateTime.now().minusDays(safeWithinDays);

        long total = queryForLong(
                """
                SELECT COUNT(*)
                FROM (
                    SELECT user_id
                    FROM app_screen_views
                    WHERE user_id IS NOT NULL AND seen_at >= ?
                    GROUP BY user_id
                    UNION
                    SELECT user_id
                    FROM push_tokens
                    WHERE is_active = true AND last_seen_at >= ?
                    GROUP BY user_id
                ) active_users
                """,
                Timestamp.valueOf(activeSince),
                Timestamp.valueOf(activeSince)
        );

        List<ActiveUserActivity> content = jdbc.query(
                """
                WITH screen_activity AS (
                    SELECT
                        user_id,
                        COUNT(*) AS screen_views,
                        MAX(seen_at) AS screen_last_seen_at
                    FROM app_screen_views
                    WHERE user_id IS NOT NULL AND seen_at >= ?
                    GROUP BY user_id
                ),
                push_activity AS (
                    SELECT
                        user_id,
                        MAX(last_seen_at) AS push_last_seen_at
                    FROM push_tokens
                    WHERE is_active = true AND last_seen_at >= ?
                    GROUP BY user_id
                ),
                combined AS (
                    SELECT
                        COALESCE(sa.user_id, pa.user_id) AS user_id,
                        COALESCE(sa.screen_views, 0) AS screen_views,
                        sa.screen_last_seen_at,
                        pa.push_last_seen_at,
                        GREATEST(
                            COALESCE(sa.screen_last_seen_at, TIMESTAMP '1970-01-01 00:00:00'),
                            COALESCE(pa.push_last_seen_at, TIMESTAMP '1970-01-01 00:00:00')
                        ) AS last_active_at
                    FROM screen_activity sa
                    FULL OUTER JOIN push_activity pa
                        ON sa.user_id = pa.user_id
                )
                SELECT user_id, screen_views, screen_last_seen_at, push_last_seen_at, last_active_at
                FROM combined
                ORDER BY last_active_at DESC, user_id DESC
                LIMIT ? OFFSET ?
                """,
                (rs, rowNum) -> new ActiveUserActivity(
                        rs.getLong("user_id"),
                        rs.getLong("screen_views"),
                        toLocalDateTime(rs, "screen_last_seen_at"),
                        toLocalDateTime(rs, "push_last_seen_at"),
                        toLocalDateTime(rs, "last_active_at")
                ),
                Timestamp.valueOf(activeSince),
                Timestamp.valueOf(activeSince),
                pageable.getPageSize(),
                pageable.getOffset()
        );

        return new PageImpl<>(content, pageable, total);
    }

    private long queryForLong(String sql, Object... args) {
        Long value = jdbc.queryForObject(sql, Long.class, args);
        return value != null ? value : 0L;
    }

    private LocalDateTime queryForDateTime(String sql, Object... args) {
        Timestamp value = jdbc.query(sql, rs -> rs.next() ? rs.getTimestamp(1) : null, args);
        return value != null ? value.toLocalDateTime() : null;
    }

    private static LocalDateTime toLocalDateTime(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value != null ? value.toLocalDateTime() : null;
    }

    private static String sanitize(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() > maxLength ? trimmed.substring(0, maxLength) : trimmed;
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
