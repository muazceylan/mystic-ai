package com.mysticai.astrology.service.upstream;

import com.fasterxml.jackson.databind.JsonNode;
import com.mysticai.astrology.dto.HoroscopeMeta;
import com.mysticai.astrology.dto.UpstreamSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@Slf4j
public class AztroClient {

    private static final String BASE_URL = "https://aztro.samerat.com/";
    private final RestTemplate restTemplate = new RestTemplate();

    public UpstreamSource fetch(String sign, String period) {
        try {
            String day = period.equals("weekly") ? "week" : "today";
            String url = BASE_URL + "?sign=" + sign.toLowerCase() + "&day=" + day;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            HttpEntity<String> entity = new HttpEntity<>("", headers);

            JsonNode response = restTemplate.postForObject(url, entity, JsonNode.class);
            if (response != null) {
                String text = response.has("description")
                        ? response.get("description").asText()
                        : "";

                HoroscopeMeta meta = HoroscopeMeta.builder()
                        .luckyColor(getField(response, "color"))
                        .luckyNumber(getField(response, "lucky_number"))
                        .compatibility(getField(response, "compatibility"))
                        .mood(getField(response, "mood"))
                        .build();

                return UpstreamSource.builder()
                        .name("aztro")
                        .text(text)
                        .meta(meta)
                        .build();
            }
        } catch (Exception e) {
            log.warn("Aztro fetch failed for {}: {}", sign, e.getMessage());
        }
        return null;
    }

    private String getField(JsonNode node, String field) {
        return node.has(field) ? node.get(field).asText() : null;
    }
}
