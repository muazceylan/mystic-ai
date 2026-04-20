package com.mysticai.notification.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Drops stale Hibernate-generated CHECK constraints that break when new enum values are added.
 * Safe to run on every startup — uses IF EXISTS, no-op if already dropped.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseMigrationRunner implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(ApplicationArguments args) {
        createProductAnalyticsTablesIfNeeded();
        extendMonetizationTablesIfNeeded();
        dropCheckConstraintIfExists("audit_logs", "action_type");
        dropCheckConstraintIfExists("audit_logs", "entity_type");
        // Notification enums evolve frequently (e.g. new NotificationType values).
        // Keep legacy Hibernate CHECK constraints from blocking new rows.
        dropCheckConstraintIfExists("notifications", "type");
        dropCheckConstraintIfExists("notifications", "status");
        dropCheckConstraintIfExists("notifications", "category");
        dropCheckConstraintIfExists("notifications", "analysis_type");
        dropCheckConstraintIfExists("notifications", "delivery_channel");
        dropCheckConstraintIfExists("notifications", "priority");
        // Monetization enum constraints — evolve as new strategies/types are added
        dropCheckConstraintIfExists("monetization_settings", "status");
        dropCheckConstraintIfExists("module_monetization_rules", "ad_strategy");
        dropCheckConstraintIfExists("module_monetization_rules", "ad_offer_frequency_mode");
        dropCheckConstraintIfExists("module_monetization_rules", "preview_depth_mode");
        dropCheckConstraintIfExists("module_monetization_rules", "rollout_status");
        dropCheckConstraintIfExists("monetization_actions", "unlock_type");
        dropCheckConstraintIfExists("guru_wallet", "status");
        dropCheckConstraintIfExists("guru_ledger", "transaction_type");
        dropCheckConstraintIfExists("guru_ledger", "source_type");
        dropCheckConstraintIfExists("guru_product_catalog", "product_type");
        dropCheckConstraintIfExists("guru_product_catalog", "rollout_status");
    }

    private void createProductAnalyticsTablesIfNeeded() {
        try {
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS app_screen_views (
                        id BIGSERIAL PRIMARY KEY,
                        user_id BIGINT,
                        screen_key VARCHAR(120) NOT NULL,
                        route_path VARCHAR(255),
                        platform VARCHAR(20),
                        session_id VARCHAR(120),
                        seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                    """);
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_app_screen_views_seen_at ON app_screen_views (seen_at DESC)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_app_screen_views_user_seen_at ON app_screen_views (user_id, seen_at DESC)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_app_screen_views_screen_key ON app_screen_views (screen_key)");
        } catch (Exception e) {
            log.warn("Could not initialize app_screen_views table: {}", e.getMessage());
        }
    }

    private void extendMonetizationTablesIfNeeded() {
        try {
            jdbc.execute("ALTER TABLE monetization_actions ADD COLUMN IF NOT EXISTS dialog_title VARCHAR(255)");
            jdbc.execute("ALTER TABLE monetization_actions ADD COLUMN IF NOT EXISTS dialog_description TEXT");
            jdbc.execute("ALTER TABLE monetization_actions ADD COLUMN IF NOT EXISTS primary_cta_label VARCHAR(255)");
            jdbc.execute("ALTER TABLE monetization_actions ADD COLUMN IF NOT EXISTS secondary_cta_label VARCHAR(255)");
            jdbc.execute("ALTER TABLE monetization_actions ADD COLUMN IF NOT EXISTS analytics_key VARCHAR(255)");
            jdbc.execute("ALTER TABLE monetization_actions ADD COLUMN IF NOT EXISTS is_reward_fallback_enabled BOOLEAN NOT NULL DEFAULT FALSE");
            jdbc.execute("ALTER TABLE monetization_actions ADD COLUMN IF NOT EXISTS daily_limit INTEGER NOT NULL DEFAULT 0");
            jdbc.execute("ALTER TABLE monetization_actions ADD COLUMN IF NOT EXISTS weekly_limit INTEGER NOT NULL DEFAULT 0");

            jdbc.execute("ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS is_signup_bonus_enabled BOOLEAN NOT NULL DEFAULT FALSE");
            jdbc.execute("ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS signup_bonus_token_amount INTEGER NOT NULL DEFAULT 10");
            jdbc.execute("ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS signup_bonus_ledger_reason VARCHAR(255)");
            jdbc.execute("ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS is_signup_bonus_one_time_only BOOLEAN NOT NULL DEFAULT TRUE");
            jdbc.execute("ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS signup_bonus_registration_source VARCHAR(255)");
            jdbc.execute("ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS signup_bonus_helper_text TEXT");
        } catch (Exception e) {
            log.warn("Could not extend monetization tables: {}", e.getMessage());
        }
    }

    private void dropCheckConstraintIfExists(String table, String column) {
        // Hibernate 6 names check constraints as <table>_<column>_check
        String constraintName = table + "_" + column + "_check";
        try {
            jdbc.execute("ALTER TABLE " + table + " DROP CONSTRAINT IF EXISTS " + constraintName);
            log.debug("Dropped CHECK constraint {} on {}.{} (if it existed)", constraintName, table, column);
        } catch (Exception e) {
            log.warn("Could not drop CHECK constraint {} on {}.{}: {}", constraintName, table, column, e.getMessage());
        }
    }
}
