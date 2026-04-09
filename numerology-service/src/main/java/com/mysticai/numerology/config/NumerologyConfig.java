package com.mysticai.numerology.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Runtime configuration for the numerology module.
 *
 * premiumEnabled — controls whether destiny/soulUrge/combinedProfile sections are locked.
 *   Default: false (all sections free).
 *   Admin can toggle at runtime via NumerologyAdminController.
 *   Persists across restarts via NUMEROLOGY_PREMIUM_ENABLED env var.
 */
@Configuration
public class NumerologyConfig {

    private final AtomicBoolean premiumEnabled;

    public NumerologyConfig(
            @Value("${numerology.premium-enabled:false}") boolean premiumEnabledFromConfig
    ) {
        this.premiumEnabled = new AtomicBoolean(premiumEnabledFromConfig);
    }

    public boolean isPremiumEnabled() {
        return premiumEnabled.get();
    }

    public void setPremiumEnabled(boolean value) {
        premiumEnabled.set(value);
    }

    @Bean
    public RestTemplate numerologyRestTemplate() {
        return new RestTemplate();
    }
}
