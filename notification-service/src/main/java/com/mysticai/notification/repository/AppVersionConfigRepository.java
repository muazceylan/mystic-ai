package com.mysticai.notification.repository;

import com.mysticai.notification.entity.AppVersionConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppVersionConfigRepository extends JpaRepository<AppVersionConfig, Long> {
    Optional<AppVersionConfig> findByPlatform(String platform);
}
