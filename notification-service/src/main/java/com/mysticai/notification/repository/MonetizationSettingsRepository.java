package com.mysticai.notification.repository;

import com.mysticai.notification.entity.monetization.MonetizationSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface MonetizationSettingsRepository
        extends JpaRepository<MonetizationSettings, Long>, JpaSpecificationExecutor<MonetizationSettings> {

    Optional<MonetizationSettings> findBySettingsKey(String settingsKey);

    Optional<MonetizationSettings> findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status status);

    Optional<MonetizationSettings> findFirstByOrderByConfigVersionDesc();

    boolean existsBySettingsKey(String settingsKey);
}
