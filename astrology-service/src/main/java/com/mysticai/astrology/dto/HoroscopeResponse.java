package com.mysticai.astrology.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class HoroscopeResponse {
    private String date;
    private String period;      // "daily" | "weekly"
    private String sign;
    private String language;    // "tr" | "en"
    private List<String> highlights;
    private HoroscopeSections sections;
    private HoroscopeMeta meta;
}
