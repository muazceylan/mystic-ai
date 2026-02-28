package com.mysticai.astrology.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class HoroscopeMeta {
    @JsonProperty("lucky_color")
    private String luckyColor;

    @JsonProperty("lucky_number")
    private String luckyNumber;

    private String compatibility;
    private String mood;
}
