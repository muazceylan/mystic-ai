package com.mysticai.orchestrator.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@ConfigurationProperties(prefix = "ai")
public class AiOrchestrationProperties {

    private FallbackProperties fallback = new FallbackProperties();
    private Map<String, ProviderProperties> providers = new LinkedHashMap<>();

    public FallbackProperties getFallback() {
        return fallback;
    }

    public void setFallback(FallbackProperties fallback) {
        this.fallback = fallback;
    }

    public Map<String, ProviderProperties> getProviders() {
        return providers;
    }

    public void setProviders(Map<String, ProviderProperties> providers) {
        this.providers = providers;
    }

    public ProviderProperties provider(String providerKey) {
        return providers.getOrDefault(providerKey, new ProviderProperties());
    }

    public static class FallbackProperties {

        private boolean allowMock = true;
        private ChainsProperties chains = new ChainsProperties();

        public boolean isAllowMock() {
            return allowMock;
        }

        public void setAllowMock(boolean allowMock) {
            this.allowMock = allowMock;
        }

        public ChainsProperties getChains() {
            return chains;
        }

        public void setChains(ChainsProperties chains) {
            this.chains = chains;
        }
    }

    public static class ChainsProperties {

        private List<String> complex = new ArrayList<>(List.of("gemini", "groqPremium", "groqFast", "openrouter", "localLlm"));
        private List<String> simple = new ArrayList<>(List.of("gemini", "groqFast", "openrouter", "localLlm"));

        public List<String> getComplex() {
            return complex;
        }

        public void setComplex(List<String> complex) {
            this.complex = complex;
        }

        public List<String> getSimple() {
            return simple;
        }

        public void setSimple(List<String> simple) {
            this.simple = simple;
        }
    }

    public static class ProviderProperties {

        private boolean enabled = true;
        private String model;
        private String providerType;
        private String baseUrl;
        private String chatEndpoint;
        private String apiKey;
        private Map<String, String> headers = new LinkedHashMap<>();
        private int timeoutMs = 8000;
        private int retryCount = 0;
        private int cooldownSeconds = 60;
        private int priority = 0;
        private Double temperature;
        private Integer maxOutputTokens;

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

        public String getProviderType() {
            return providerType;
        }

        public void setProviderType(String providerType) {
            this.providerType = providerType;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getChatEndpoint() {
            return chatEndpoint;
        }

        public void setChatEndpoint(String chatEndpoint) {
            this.chatEndpoint = chatEndpoint;
        }

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
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

        public int getPriority() {
            return priority;
        }

        public void setPriority(int priority) {
            this.priority = priority;
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
