package com.mysticai.auth.config.properties;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URISyntaxException;

@Component
@Slf4j
public class PublicUrlProperties {

    private final String apiPublicUrl;
    private final String appPublicUrl;
    private final DeploymentEnv env;
    private final boolean invalidAppUrlConfigured;
    private final String configuredAppPublicUrl;

    public PublicUrlProperties(
            @Value("${API_PUBLIC_URL:http://localhost:8080}") String apiPublicUrl,
            @Value("${APP_PUBLIC_URL:}") String appPublicUrl,
            @Value("${ENV:local}") String env
    ) {
        this.apiPublicUrl = stripTrailingSlash(apiPublicUrl);
        String normalizedAppPublicUrl = stripTrailingSlash(appPublicUrl);
        this.configuredAppPublicUrl = normalizedAppPublicUrl;
        this.invalidAppUrlConfigured = !normalizedAppPublicUrl.isBlank() && !isValidPublicUrl(normalizedAppPublicUrl);
        this.appPublicUrl = invalidAppUrlConfigured ? "" : normalizedAppPublicUrl;
        this.env = DeploymentEnv.from(env);
    }

    @PostConstruct
    void validate() {
        if (!isValidPublicUrl(apiPublicUrl)) {
            throw new IllegalStateException("API_PUBLIC_URL is invalid: " + apiPublicUrl);
        }

        if (invalidAppUrlConfigured && env != DeploymentEnv.PROD) {
            log.warn("APP_PUBLIC_URL is invalid. Falling back to HTML verification page. APP_PUBLIC_URL={}", configuredAppPublicUrl);
        }

        if (env == DeploymentEnv.PROD && !isValidPublicUrl(appPublicUrl)) {
            throw new IllegalStateException("APP_PUBLIC_URL must be a valid absolute URL when ENV=prod");
        }
    }

    public String apiPublicUrl() {
        return apiPublicUrl;
    }

    public String appPublicUrl() {
        return appPublicUrl;
    }

    public DeploymentEnv env() {
        return env;
    }

    public boolean hasAppPublicUrl() {
        return !appPublicUrl.isBlank();
    }

    private static String stripTrailingSlash(String value) {
        if (value == null) {
            return "";
        }
        String normalized = value.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private static boolean isValidPublicUrl(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        try {
            URI uri = new URI(value);
            String scheme = uri.getScheme();
            return (scheme != null && (scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https")))
                    && uri.getHost() != null;
        } catch (URISyntaxException ex) {
            return false;
        }
    }
}
