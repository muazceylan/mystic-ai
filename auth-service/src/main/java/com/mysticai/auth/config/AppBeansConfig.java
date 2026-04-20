package com.mysticai.auth.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Clock;
import java.time.Duration;

@Configuration
public class AppBeansConfig {

    @Bean
    public Clock systemClock() {
        return Clock.systemUTC();
    }

    @Bean
    public RestTemplate astrologyRestTemplate(
            RestTemplateBuilder builder,
            @Value("${services.astrology.connect-timeout:2s}") Duration connectTimeout,
            @Value("${services.astrology.read-timeout:20s}") Duration readTimeout
    ) {
        return builder
                .connectTimeout(connectTimeout)
                .readTimeout(readTimeout)
                .build();
    }

    @Bean
    public RestTemplate notificationRestTemplate(
            RestTemplateBuilder builder,
            @Value("${services.notification.connect-timeout:2s}") Duration connectTimeout,
            @Value("${services.notification.read-timeout:10s}") Duration readTimeout
    ) {
        return builder
                .connectTimeout(connectTimeout)
                .readTimeout(readTimeout)
                .build();
    }
}
