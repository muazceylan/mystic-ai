package com.mysticai.notification.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Allowlist configuration for the rewarded-ads flow.
 *
 * WHY: Provides defense-in-depth against:
 * - Forged pageContext / placementKey values from tampered requests.
 * - Cross-origin claim attempts from unexpected domains.
 * - Ad unit path injection from frontend env vars.
 *
 * enforceOriginCheck = true → reject mismatches with 400 (production recommendation).
 * enforceOriginCheck = false → log warning only (default; useful during rollout).
 *
 * Backend reward amount is ALWAYS from server config — allowlists are additional defence.
 */
@Component
@ConfigurationProperties(prefix = "rewarded-ads")
@Getter
@Setter
public class RewardedAdsAllowlistProperties {

    /**
     * Allowed Origin/Referer domain patterns for claim requests.
     * Supports prefix matching (e.g. "https://mysticai.com").
     * Empty list = no origin enforcement.
     */
    private List<String> allowedOrigins = List.of();

    /**
     * Allowed placement keys. Claims with unrecognised placementKey are rejected.
     * Empty list = any placement key accepted (dev mode).
     */
    private List<String> allowedPlacements = List.of();

    /**
     * Allowed GAM ad unit paths. Intent creation with an unrecognised adUnitPath
     * falls back to the server's configured default rather than accepting frontend value.
     */
    private List<String> allowedAdUnitPaths = List.of();

    /**
     * When true: origin mismatch → HTTP 400.
     * When false (default): origin mismatch → WARN log only.
     */
    private boolean enforceOriginCheck = false;

    /** Checks whether the given origin is in the allowed list. Empty list = all allowed. */
    public boolean isOriginAllowed(String origin) {
        if (origin == null || allowedOrigins.isEmpty()) return true;
        return allowedOrigins.stream().anyMatch(origin::startsWith);
    }

    /** Checks whether the given placement key is in the allowed list. Empty list = all allowed. */
    public boolean isPlacementAllowed(String placementKey) {
        if (placementKey == null || allowedPlacements.isEmpty()) return true;
        return allowedPlacements.contains(placementKey);
    }

    /** Checks whether the given ad unit path is in the allowed list. Empty list = all allowed. */
    public boolean isAdUnitPathAllowed(String adUnitPath) {
        if (adUnitPath == null || allowedAdUnitPaths.isEmpty()) return true;
        return allowedAdUnitPaths.contains(adUnitPath);
    }
}
