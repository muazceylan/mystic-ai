package com.mysticai.astrology.service.upstream;

import com.fasterxml.jackson.databind.JsonNode;
import com.mysticai.astrology.dto.UpstreamSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@Slf4j
public class ApiNinjasHoroscopeClient {

    private static final String BASE_URL = "https://api.api-ninjas.com/v1/horoscope";
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${api-ninjas.api-key:}")
    private String apiKey;

    public UpstreamSource fetch(String sign) {
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("API Ninjas key not configured, skipping");
            return null;
        }
        try {
            String url = BASE_URL + "?zodiac=" + sign.toLowerCase();

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Api-Key", apiKey);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, JsonNode.class);

            JsonNode body = response.getBody();
            if (body != null && body.has("horoscope")) {
                return UpstreamSource.builder()
                        .name("api-ninjas")
                        .text(body.get("horoscope").asText())
                        .build();
            }
        } catch (Exception e) {
            log.warn("API Ninjas fetch failed for {}: {}", sign, e.getMessage());
        }
        return null;
    }
}
