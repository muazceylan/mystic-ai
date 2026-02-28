package com.mysticai.astrology.service.upstream;

import com.fasterxml.jackson.databind.JsonNode;
import com.mysticai.astrology.dto.UpstreamSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@Slf4j
public class OhmandaClient {

    private static final String BASE_URL = "https://ohmanda.com/api/horoscope/";
    private final RestTemplate restTemplate = new RestTemplate();

    public UpstreamSource fetch(String sign) {
        try {
            String url = BASE_URL + sign.toLowerCase() + "/";
            JsonNode response = restTemplate.getForObject(url, JsonNode.class);
            if (response != null && response.has("horoscope")) {
                return UpstreamSource.builder()
                        .name("ohmanda")
                        .text(response.get("horoscope").asText())
                        .build();
            }
        } catch (Exception e) {
            log.warn("Ohmanda fetch failed for {}: {}", sign, e.getMessage());
        }
        return null;
    }
}
