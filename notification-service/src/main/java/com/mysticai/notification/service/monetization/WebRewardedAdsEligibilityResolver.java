package com.mysticai.notification.service.monetization;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mysticai.notification.entity.monetization.MonetizationSettings;
import com.mysticai.notification.repository.MonetizationSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Resolves whether web rewarded ads are actually available right now.
 *
 * Source of truth:
 * 1. Global env kill-switch (`rewarded-ads.enabled`)
 * 2. Published monetization settings must exist
 * 3. Monetization and ads must be enabled in settings
 * 4. Web ads flag in environmentRulesJson must be enabled
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WebRewardedAdsEligibilityResolver {

    private final MonetizationSettingsRepository settingsRepository;
    private final ObjectMapper objectMapper;

    @Value("${rewarded-ads.enabled:true}")
    private boolean rewardedAdsKillSwitchEnabled;

    @Transactional(readOnly = true)
    public boolean isWebRewardedAdsEnabledForPublishedSettings() {
        return settingsRepository
                .findFirstByStatusOrderByConfigVersionDesc(MonetizationSettings.Status.PUBLISHED)
                .map(this::isWebRewardedAdsEnabled)
                .orElse(false);
    }

    public boolean isWebRewardedAdsEnabled(MonetizationSettings settings) {
        if (!rewardedAdsKillSwitchEnabled || settings == null) {
            return false;
        }
        if (!settings.isEnabled() || !settings.isAdsEnabled()) {
            return false;
        }
        return resolveWebAdsToggle(settings);
    }

    boolean resolveWebAdsToggle(MonetizationSettings settings) {
        String environmentRulesJson = settings.getEnvironmentRulesJson();
        if (environmentRulesJson == null || environmentRulesJson.isBlank()) {
            return true;
        }

        try {
            JsonNode root = objectMapper.readTree(environmentRulesJson);

            JsonNode directFlag = root.get("webAdsEnabled");
            if (directFlag != null && directFlag.isBoolean()) {
                return directFlag.asBoolean();
            }

            JsonNode platformFlag = root.path("platforms").path("web").get("adsEnabled");
            if (platformFlag != null && platformFlag.isBoolean()) {
                return platformFlag.asBoolean();
            }

            JsonNode legacyFlag = root.path("web").get("adsEnabled");
            if (legacyFlag != null && legacyFlag.isBoolean()) {
                return legacyFlag.asBoolean();
            }
        } catch (Exception ex) {
            log.warn(
                    "Failed to parse monetization environment rules for settings key {}. Falling back to web ads enabled.",
                    settings.getSettingsKey(),
                    ex
            );
        }

        return true;
    }
}
