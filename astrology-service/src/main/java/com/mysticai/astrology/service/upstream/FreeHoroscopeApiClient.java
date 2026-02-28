package com.mysticai.astrology.service.upstream;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.mysticai.astrology.dto.UpstreamSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@Slf4j
public class FreeHoroscopeApiClient {

    private static final String BASE_URL = "https://horoscope-app-api.vercel.app/api/v1/get-horoscope";
    private final RestTemplate restTemplate = new RestTemplate();

    public UpstreamSource fetch(String sign, String period) {
        try {
            String endpoint = period.equals("weekly")
                    ? BASE_URL + "/weekly?sign=" + capitalize(sign)
                    : BASE_URL + "/daily?sign=" + capitalize(sign) + "&day=TODAY";
            JsonNode response = restTemplate.getForObject(endpoint, JsonNode.class);
            if (response != null && response.has("data")) {
                JsonNode data = response.get("data");
                String text = data.has("horoscope_data")
                        ? data.get("horoscope_data").asText()
                        : data.toString();
                return UpstreamSource.builder()
                        .name("freehoroscopeapi")
                        .text(text)
                        .build();
            }
        } catch (Exception e) {
            log.warn("FreeHoroscopeApi fetch failed for {}: {}", sign, e.getMessage());
        }
        return null;
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return s.substring(0, 1).toUpperCase() + s.substring(1).toLowerCase();
    }
}
