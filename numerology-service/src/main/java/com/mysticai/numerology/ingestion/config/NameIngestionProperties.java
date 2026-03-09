package com.mysticai.numerology.ingestion.config;

import com.mysticai.numerology.ingestion.model.SourceName;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashMap;
import java.util.Map;

@Getter
@Setter
@ConfigurationProperties(prefix = "name-ingestion")
public class NameIngestionProperties {

    private boolean enabled = true;
    private boolean respectRobotsTxt = true;
    private String scheduleCron = "0 20 3 * * *";
    private int sourceRunTimeoutSeconds = 3600;
    private int lockStaleSeconds = 900;
    private int lockHeartbeatIntervalSeconds = 10;
    private Http http = new Http();
    private Map<String, SourceSettings> sources = new HashMap<>();

    public SourceSettings settingsFor(SourceName sourceName) {
        SourceSettings settings = sources.get(sourceName.getConfigKey());
        if (settings == null) {
            return new SourceSettings();
        }
        return settings;
    }

    @Getter
    @Setter
    public static class Http {
        private int connectTimeoutMs = 8000;
        private int readTimeoutMs = 15000;
        private int maxRetries = 2;
        private int retryBackoffMs = 800;
        private String userAgent = "MysticAI-NameIngestionBot/1.0";
    }

    @Getter
    @Setter
    public static class SourceSettings {
        private boolean enabled = true;
        private int rateLimitMs = 600;
        private int maxDiscoveryUrls = 5000;
        private int maxFetchUrlsPerRun = 5000;
    }
}
