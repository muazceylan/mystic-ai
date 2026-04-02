package com.mysticai.orchestrator.config;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class AiRuntimeConfig {

    private boolean allowMock = true;
    private List<String> complexChain = new ArrayList<>();
    private List<String> simpleChain = new ArrayList<>();
    private Map<String, ProviderConfig> providers = new LinkedHashMap<>();

    public boolean isAllowMock() {
        return allowMock;
    }

    public void setAllowMock(boolean allowMock) {
        this.allowMock = allowMock;
    }

    public List<String> getComplexChain() {
        return complexChain;
    }

    public void setComplexChain(List<String> complexChain) {
        this.complexChain = complexChain;
    }

    public List<String> getSimpleChain() {
        return simpleChain;
    }

    public void setSimpleChain(List<String> simpleChain) {
        this.simpleChain = simpleChain;
    }

    public Map<String, ProviderConfig> getProviders() {
        return providers;
    }

    public void setProviders(Map<String, ProviderConfig> providers) {
        this.providers = providers;
    }

    public ProviderConfig provider(String key) {
        if (key == null || providers == null) {
            return null;
        }
        return providers.get(key);
    }

    public static class ProviderConfig {

        private String key;
        private String displayName;
        private String adapter;
        private boolean enabled = true;
        private String model;
        private String baseUrl;
        private String apiKey;
        private String localProviderType;
        private String chatEndpoint;
        private Map<String, String> headers = new LinkedHashMap<>();
        private int timeoutMs = 8000;
        private int retryCount = 0;
        private int cooldownSeconds = 60;
        private Double temperature;
        private Integer maxOutputTokens;

        public String getKey() {
            return key;
        }

        public void setKey(String key) {
            this.key = key;
        }

        public String getDisplayName() {
            return displayName;
        }

        public void setDisplayName(String displayName) {
            this.displayName = displayName;
        }

        public String getAdapter() {
            return adapter;
        }

        public void setAdapter(String adapter) {
            this.adapter = adapter;
        }

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getLocalProviderType() {
            return localProviderType;
        }

        public void setLocalProviderType(String localProviderType) {
            this.localProviderType = localProviderType;
        }

        public String getChatEndpoint() {
            return chatEndpoint;
        }

        public void setChatEndpoint(String chatEndpoint) {
            this.chatEndpoint = chatEndpoint;
        }

        public Map<String, String> getHeaders() {
            return headers;
        }

        public void setHeaders(Map<String, String> headers) {
            this.headers = headers;
        }

        public int getTimeoutMs() {
            return timeoutMs;
        }

        public void setTimeoutMs(int timeoutMs) {
            this.timeoutMs = timeoutMs;
        }

        public int getRetryCount() {
            return retryCount;
        }

        public void setRetryCount(int retryCount) {
            this.retryCount = retryCount;
        }

        public int getCooldownSeconds() {
            return cooldownSeconds;
        }

        public void setCooldownSeconds(int cooldownSeconds) {
            this.cooldownSeconds = cooldownSeconds;
        }

        public Double getTemperature() {
            return temperature;
        }

        public void setTemperature(Double temperature) {
            this.temperature = temperature;
        }

        public Integer getMaxOutputTokens() {
            return maxOutputTokens;
        }

        public void setMaxOutputTokens(Integer maxOutputTokens) {
            this.maxOutputTokens = maxOutputTokens;
        }
    }
}
