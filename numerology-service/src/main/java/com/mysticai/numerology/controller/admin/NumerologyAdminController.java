package com.mysticai.numerology.controller.admin;

import com.mysticai.numerology.config.NumerologyConfig;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Admin endpoints for numerology runtime configuration.
 *
 * Gateway path: /api/numerology/admin/config/**
 *   → rewrite → /admin/config/** on numerology-service
 *
 * Premium toggle persists only for the lifetime of the JVM instance.
 * For permanent change, set NUMEROLOGY_PREMIUM_ENABLED env var and redeploy.
 */
@RestController
@RequestMapping("/admin/config")
public class NumerologyAdminController {

    private final NumerologyConfig numerologyConfig;

    public NumerologyAdminController(NumerologyConfig numerologyConfig) {
        this.numerologyConfig = numerologyConfig;
    }

    /**
     * GET /api/admin/v1/numerology/config
     * Returns the current runtime configuration state.
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        return ResponseEntity.ok(Map.of(
                "premiumEnabled", numerologyConfig.isPremiumEnabled(),
                "note", "premiumEnabled toggles destiny/soulUrge/combinedProfile section locks. " +
                         "Runtime only — set NUMEROLOGY_PREMIUM_ENABLED env var for persistence."
        ));
    }

    /**
     * PUT /api/admin/v1/numerology/config/premium
     * Body: {"enabled": true|false}
     * Toggles premium section locking at runtime.
     */
    @PutMapping("/config/premium")
    public ResponseEntity<Map<String, Object>> setPremium(@RequestBody Map<String, Boolean> body) {
        Boolean enabled = body.get("enabled");
        if (enabled == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Field 'enabled' is required."));
        }
        numerologyConfig.setPremiumEnabled(enabled);
        return ResponseEntity.ok(Map.of(
                "premiumEnabled", numerologyConfig.isPremiumEnabled(),
                "applied", true
        ));
    }
}
