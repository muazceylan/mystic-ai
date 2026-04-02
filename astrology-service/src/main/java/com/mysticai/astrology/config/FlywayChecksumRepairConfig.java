package com.mysticai.astrology.config;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.exception.FlywayValidateException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Configuration
public class FlywayChecksumRepairConfig {

    private static final Logger log = LoggerFactory.getLogger(FlywayChecksumRepairConfig.class);
    private static final int LEGACY_MIGRATION_V2 = 2;
    private static final int LEGACY_MIGRATION_V5 = 5;
    private static final Pattern CHECKSUM_MISMATCH_VERSION_PATTERN =
        Pattern.compile("Migration checksum mismatch for migration version\\s+(\\d+)");

    @Value("${app.flyway.auto-repair-known-checksum-mismatch:true}")
    private boolean autoRepairKnownChecksumMismatch;

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return this::migrateWithKnownChecksumRepair;
    }

    private void migrateWithKnownChecksumRepair(Flyway flyway) {
        try {
            flyway.migrate();
        } catch (FlywayValidateException ex) {
            if (!autoRepairKnownChecksumMismatch || !isKnownLegacyChecksumMismatch(ex.getMessage())) {
                throw ex;
            }

            log.warn(
                "Detected known Flyway checksum drift (V2/V5) in astrology-service. "
                    + "Running automatic flyway.repair() and retrying migrate()."
            );

            flyway.repair();
            flyway.migrate();
        }
    }

    private boolean isKnownLegacyChecksumMismatch(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }

        Matcher matcher = CHECKSUM_MISMATCH_VERSION_PATTERN.matcher(message);
        Set<Integer> mismatchedVersions = new HashSet<>();
        while (matcher.find()) {
            mismatchedVersions.add(Integer.parseInt(matcher.group(1)));
        }

        if (mismatchedVersions.isEmpty()) {
            return false;
        }

        return mismatchedVersions.stream()
            .allMatch(version -> version == LEGACY_MIGRATION_V2 || version == LEGACY_MIGRATION_V5);
    }
}
