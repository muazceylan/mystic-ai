package com.mysticai.astrology.controller;

import com.mysticai.astrology.dto.HoroscopeResponse;
import com.mysticai.astrology.service.HoroscopeFusionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/horoscope")
@RequiredArgsConstructor
@Slf4j
public class HoroscopeController {

    private final HoroscopeFusionService horoscopeFusionService;

    @GetMapping
    public ResponseEntity<HoroscopeResponse> getHoroscope(
            @RequestParam String sign,
            @RequestParam(defaultValue = "daily") String period,
            @RequestParam(defaultValue = "tr") String lang) {

        log.info("Horoscope request: sign={}, period={}, lang={}", sign, period, lang);

        if (!isValidSign(sign)) {
            return ResponseEntity.badRequest().build();
        }
        if (!period.equals("daily") && !period.equals("weekly")) {
            return ResponseEntity.badRequest().build();
        }

        HoroscopeResponse response = horoscopeFusionService.getHoroscope(
                sign.toLowerCase(), period, lang);

        if (response == null) {
            return ResponseEntity.status(503).build();
        }

        return ResponseEntity.ok(response);
    }

    private boolean isValidSign(String sign) {
        return sign != null && VALID_SIGNS.contains(sign.toLowerCase());
    }

    private static final java.util.Set<String> VALID_SIGNS = java.util.Set.of(
            "aries", "taurus", "gemini", "cancer",
            "leo", "virgo", "libra", "scorpio",
            "sagittarius", "capricorn", "aquarius", "pisces"
    );
}
