package com.mysticai.notification.service;

import com.mysticai.notification.dto.AppVersionResponse;
import com.mysticai.notification.entity.AppVersionConfig;
import com.mysticai.notification.repository.AppVersionConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class AppVersionService {

    private static final Set<String> SUPPORTED_PLATFORMS = Set.of("ios", "android");

    private final AppVersionConfigRepository repository;

    public boolean isSupportedPlatform(String platform) {
        return platform != null && SUPPORTED_PLATFORMS.contains(platform.toLowerCase());
    }

    public AppVersionResponse getVersionInfo(String platform) {
        String normalized = platform.toLowerCase();
        return repository.findByPlatform(normalized)
                .map(this::toResponse)
                .orElseGet(() -> AppVersionResponse.safeDefault(normalized));
    }

    private AppVersionResponse toResponse(AppVersionConfig config) {
        return new AppVersionResponse(
                config.getPlatform(),
                config.isForceUpdate(),
                config.getMinSupportedVersion(),
                config.getLatestVersion(),
                config.getMessage(),
                config.getIosStoreUrl(),
                config.getAndroidStoreUrl(),
                config.getAndroidWebStoreUrl()
        );
    }
}
