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
        dropCheckConstraintIfExists("audit_logs", "action_type");
        dropCheckConstraintIfExists("audit_logs", "entity_type");
        // Notification enums evolve frequently (e.g. new NotificationType values).
        // Keep legacy Hibernate CHECK constraints from blocking new rows.
        dropCheckConstraintIfExists("notifications", "type");
        dropCheckConstraintIfExists("notifications", "status");
        dropCheckConstraintIfExists("notifications", "category");
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
