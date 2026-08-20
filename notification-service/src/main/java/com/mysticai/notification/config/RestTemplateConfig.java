package com.mysticai.notification.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class RestTemplateConfig {

    /**
     * Connect/read timeouts are mandatory here: this template calls astrology-service,
     * whose horoscope path chains an upstream fetch plus ai-orchestrator calls. Without
     * a read timeout a slow provider pins a request thread indefinitely, long after the
     * mobile caller has already given up.
     */
    @Bean
    public RestTemplate restTemplate(
            RestTemplateBuilder builder,
            @Value("${services.rest-client.connect-timeout:5s}") Duration connectTimeout,
            @Value("${services.rest-client.read-timeout:90s}") Duration readTimeout
    ) {
        return builder
                .connectTimeout(connectTimeout)
                .readTimeout(readTimeout)
                .build();
    }
}
