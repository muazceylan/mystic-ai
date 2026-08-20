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
        createDreamExpansionReservationTableIfNeeded();
        extendAppVersionConfigIfNeeded();
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
        dropCheckConstraintIfExists("guru_token_reservations", "status");
        dropCheckConstraintIfExists("guru_product_catalog", "product_type");
        dropCheckConstraintIfExists("guru_product_catalog", "rollout_status");
        // Provider reward-callback enum columns (tables themselves are created by
        // schema.sql before Hibernate validation; these drops are only relevant under
        // local ddl-auto=update where Hibernate may add enum CHECK constraints).
        dropCheckConstraintIfExists("reward_session", "provider");
        dropCheckConstraintIfExists("reward_session", "channel");
        dropCheckConstraintIfExists("reward_session", "status");
        dropCheckConstraintIfExists("provider_callback_event", "provider");
        dropCheckConstraintIfExists("provider_callback_event", "status");
    }

    /**
     * Adds the build-number / localized-copy columns to an existing app_version_config table.
     * schema.sql only covers fresh databases; deployments created before the update policy gained
     * build numbers still need these columns before Hibernate validates the entity.
     */
    private void extendAppVersionConfigIfNeeded() {
        try {
            jdbc.execute("ALTER TABLE app_version_config ADD COLUMN IF NOT EXISTS min_supported_build INTEGER NOT NULL DEFAULT 0");
            jdbc.execute("ALTER TABLE app_version_config ADD COLUMN IF NOT EXISTS latest_build INTEGER NOT NULL DEFAULT 0");
            jdbc.execute("ALTER TABLE app_version_config ADD COLUMN IF NOT EXISTS optional_update_enabled BOOLEAN NOT NULL DEFAULT TRUE");
            jdbc.execute("ALTER TABLE app_version_config ADD COLUMN IF NOT EXISTS title_tr VARCHAR(200)");
            jdbc.execute("ALTER TABLE app_version_config ADD COLUMN IF NOT EXISTS message_tr TEXT");
            jdbc.execute("ALTER TABLE app_version_config ADD COLUMN IF NOT EXISTS title_en VARCHAR(200)");
            jdbc.execute("ALTER TABLE app_version_config ADD COLUMN IF NOT EXISTS message_en TEXT");
            jdbc.execute("ALTER TABLE app_version_config ADD COLUMN IF NOT EXISTS updated_by BIGINT");
            // Carry the pre-localization single message over so existing rows still show copy.
            jdbc.execute("UPDATE app_version_config SET message_tr = message WHERE message_tr IS NULL AND message IS NOT NULL");
        } catch (Exception e) {
            log.warn("Could not extend app_version_config: {}", e.getMessage());
        }
    }

    private void createDreamExpansionReservationTableIfNeeded() {
        try {
            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS guru_token_reservations (
                        id UUID PRIMARY KEY,
                        user_id BIGINT NOT NULL,
                        dream_id BIGINT NOT NULL,
                        expansion_type VARCHAR(48) NOT NULL,
                        action_key VARCHAR(255) NOT NULL,
                        cost INTEGER NOT NULL,
                        status VARCHAR(24) NOT NULL,
                        idempotency_key VARCHAR(255) NOT NULL,
                        ledger_transaction_id UUID,
                        created_at TIMESTAMP(6) NOT NULL,
                        updated_at TIMESTAMP(6) NOT NULL,
                        expires_at TIMESTAMP(6) NOT NULL
                    )
                    """);
            jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_gtr_idempotency ON guru_token_reservations (idempotency_key)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_gtr_user_status_expires ON guru_token_reservations (user_id, status, expires_at)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_gtr_dream_type ON guru_token_reservations (user_id, dream_id, expansion_type)");
        } catch (Exception e) {
            log.warn("Could not initialize guru_token_reservations table: {}", e.getMessage());
        }
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
            jdbc.execute("""
                    UPDATE monetization_actions
                    SET is_reward_fallback_enabled = TRUE,
                        reward_amount = CASE WHEN reward_amount <= 0 THEN 1 ELSE reward_amount END
                    WHERE module_key IN ('share_cards', 'natal_chart', 'compatibility', 'horoscope')
                      AND action_key IN (
                          'shareable_card_create',
                          'natal_chart_detail_view',
                          'compatibility_view',
                          'person_add',
                          'birth_night_poster_view',
                          'horoscope_view'
                      )
                      AND is_reward_fallback_enabled = FALSE
                      AND COALESCE(updated_by_admin_id, 0) = 0
                    """);

            jdbc.execute("ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS is_signup_bonus_enabled BOOLEAN NOT NULL DEFAULT FALSE");
            jdbc.execute("ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS signup_bonus_token_amount INTEGER NOT NULL DEFAULT 10");
            jdbc.execute("ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS signup_bonus_ledger_reason VARCHAR(255)");
            jdbc.execute("ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS is_signup_bonus_one_time_only BOOLEAN NOT NULL DEFAULT TRUE");
            jdbc.execute("ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS signup_bonus_registration_source VARCHAR(255)");
            jdbc.execute("ALTER TABLE monetization_settings ADD COLUMN IF NOT EXISTS signup_bonus_helper_text TEXT");

            jdbc.execute("ALTER TABLE module_monetization_rules ADD COLUMN IF NOT EXISTS rewarded_ad_enabled BOOLEAN NOT NULL DEFAULT TRUE");
            jdbc.execute("ALTER TABLE module_monetization_rules ADD COLUMN IF NOT EXISTS rewarded_ad_views_required INTEGER");
            jdbc.execute("ALTER TABLE module_monetization_rules ADD COLUMN IF NOT EXISTS rewarded_ad_hourly_limit INTEGER NOT NULL DEFAULT 3");
            jdbc.execute("ALTER TABLE module_monetization_rules ADD COLUMN IF NOT EXISTS rewarded_ad_daily_limit INTEGER NOT NULL DEFAULT 10");
            jdbc.execute("ALTER TABLE module_monetization_rules ADD COLUMN IF NOT EXISTS rewarded_ad_cooldown_minutes INTEGER NOT NULL DEFAULT 60");
            jdbc.execute("ALTER TABLE module_monetization_rules ADD COLUMN IF NOT EXISTS rewarded_ad_window_minutes INTEGER NOT NULL DEFAULT 60");

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS rewarded_unlock_progress (
                        id UUID PRIMARY KEY,
                        user_id BIGINT NOT NULL,
                        module_key VARCHAR(255) NOT NULL,
                        action_key VARCHAR(255) NOT NULL,
                        content_key VARCHAR(512),
                        required_views INTEGER NOT NULL,
                        completed_views INTEGER NOT NULL DEFAULT 0,
                        status VARCHAR(40) NOT NULL DEFAULT 'IN_PROGRESS',
                        last_client_event_id VARCHAR(255),
                        last_transaction_id VARCHAR(255),
                        created_at TIMESTAMP(6) NOT NULL,
                        updated_at TIMESTAMP(6),
                        unlocked_at TIMESTAMP(6),
                        expires_at TIMESTAMP(6) NOT NULL,
                        version BIGINT
                    )
                    """);
            jdbc.execute("ALTER TABLE rewarded_unlock_progress ADD COLUMN IF NOT EXISTS content_key VARCHAR(512)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_rup_user_module_action_status ON rewarded_unlock_progress (user_id, module_key, action_key, status)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_rup_user_module_action_content_status ON rewarded_unlock_progress (user_id, module_key, action_key, content_key, status)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_rup_expires ON rewarded_unlock_progress (expires_at)");

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS rewarded_unlock_event (
                        id UUID PRIMARY KEY,
                        progress_id UUID NOT NULL,
                        user_id BIGINT NOT NULL,
                        module_key VARCHAR(255) NOT NULL,
                        action_key VARCHAR(255) NOT NULL,
                        content_key VARCHAR(512),
                        client_event_id VARCHAR(255) NOT NULL,
                        transaction_id VARCHAR(255),
                        ad_network VARCHAR(80),
                        placement VARCHAR(255),
                        event_type VARCHAR(40) NOT NULL DEFAULT 'AD_COMPLETED',
                        created_at TIMESTAMP(6) NOT NULL
                    )
                    """);
            jdbc.execute("ALTER TABLE rewarded_unlock_event ADD COLUMN IF NOT EXISTS content_key VARCHAR(512)");
            jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_rue_client_event_id ON rewarded_unlock_event (client_event_id)");
            jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_rue_transaction_id ON rewarded_unlock_event (transaction_id) WHERE transaction_id IS NOT NULL");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_rue_progress ON rewarded_unlock_event (progress_id)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_rue_user_module_action_created ON rewarded_unlock_event (user_id, module_key, action_key, created_at DESC)");
            jdbc.execute("CREATE INDEX IF NOT EXISTS idx_rue_user_module_action_content_created ON rewarded_unlock_event (user_id, module_key, action_key, content_key, created_at DESC)");
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
