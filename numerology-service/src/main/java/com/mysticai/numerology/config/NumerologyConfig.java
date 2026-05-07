package com.mysticai.numerology.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
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
@Configuration(proxyBeanMethods = false)
public class NumerologyConfig {

    private final AtomicBoolean premiumEnabled;
    private final int guidanceConnectTimeoutMs;
    private final int guidanceReadTimeoutMs;

    @Autowired
    public NumerologyConfig(
            @Value("${numerology.premium-enabled:false}") boolean premiumEnabledFromConfig,
            @Value("${services.ai-orchestrator.guidance-connect-timeout-ms:500}") long guidanceConnectTimeoutMs,
            @Value("${services.ai-orchestrator.guidance-timeout-ms:1500}") long guidanceReadTimeoutMs
    ) {
        this.premiumEnabled = new AtomicBoolean(premiumEnabledFromConfig);
        long resolvedConnectTimeoutMs = Math.max(250L, guidanceConnectTimeoutMs);
        long resolvedReadTimeoutMs = Math.max(resolvedConnectTimeoutMs, guidanceReadTimeoutMs);
        this.guidanceConnectTimeoutMs = Math.toIntExact(resolvedConnectTimeoutMs);
        this.guidanceReadTimeoutMs = Math.toIntExact(resolvedReadTimeoutMs);
    }

    public NumerologyConfig(boolean premiumEnabledFromConfig) {
        this(premiumEnabledFromConfig, 500L, 1500L);
    }

    public boolean isPremiumEnabled() {
        return premiumEnabled.get();
    }

    public void setPremiumEnabled(boolean value) {
        premiumEnabled.set(value);
    }

    @Bean
    public RestTemplate numerologyRestTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(guidanceConnectTimeoutMs);
        requestFactory.setReadTimeout(guidanceReadTimeoutMs);
        return new RestTemplate(requestFactory);
    }
}
