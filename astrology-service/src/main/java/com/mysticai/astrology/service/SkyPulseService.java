package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.PlanetPosition;
import com.mysticai.astrology.dto.SkyPulseResponse;
import com.mysticai.astrology.entity.ZodiacSign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class SkyPulseService {

    private final TransitCalculator transitCalculator;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String CACHE_KEY = "sky-pulse:today";
    private static final long CACHE_TTL_HOURS = 4;

    private static final String[] PLANET_NAMES_TR = {
            "Güneş", "Ay", "Merkür", "Venüs", "Mars",
            "Jüpiter", "Satürn", "Uranüs", "Neptün", "Plüton",
            "Kiron", "Kuzey Düğümü"
    };

    public SkyPulseResponse getSkyPulse() {
        // Try cache first
        try {
            String cached = redisTemplate.opsForValue().get(CACHE_KEY);
            if (cached != null) {
                return objectMapper.readValue(cached, SkyPulseResponse.class);
            }
        } catch (Exception e) {
            log.debug("Cache miss for sky-pulse: {}", e.getMessage());
        }

        // Calculate fresh
        LocalDate today = LocalDate.now();
        List<PlanetPosition> transits = transitCalculator.calculateTransitPositions(today);

        // Moon is index 1
        PlanetPosition moon = transits.get(1);
        String moonPhase = transitCalculator.getMoonPhase(today);

        // Map English sign name to ZodiacSign enum for Turkish name
        ZodiacSign moonZodiac = mapToZodiacSign(moon.sign());

        // Collect retrograde planets (skip Sun=0 and Moon=1)
        List<String> retrogradePlanets = new ArrayList<>();
        for (int i = 2; i < transits.size(); i++) {
            if (transits.get(i).retrograde()) {
                retrogradePlanets.add(PLANET_NAMES_TR[i]);
            }
        }

        // Generate daily vibe
        String dailyVibe = generateDailyVibe(transits, moonPhase, retrogradePlanets);

        SkyPulseResponse response = new SkyPulseResponse(
                moon.sign(),
                moonZodiac.getTurkishName(),
                moonZodiac.getSymbol(),
                moonPhase,
                retrogradePlanets,
                dailyVibe,
                today
        );

        // Cache for 4 hours
        try {
            redisTemplate.opsForValue().set(CACHE_KEY,
                    objectMapper.writeValueAsString(response), CACHE_TTL_HOURS, TimeUnit.HOURS);
        } catch (Exception e) {
            log.debug("Failed to cache sky-pulse: {}", e.getMessage());
        }

        return response;
    }

    private String generateDailyVibe(List<PlanetPosition> transits, String moonPhase,
                                     List<String> retrogradePlanets) {
        PlanetPosition moon = transits.get(1);
        ZodiacSign moonSign = mapToZodiacSign(moon.sign());
        String element = moonSign.getElement();

        // Mercury retrograde takes priority
        boolean mercuryRetro = transits.get(2).retrograde();
        if (mercuryRetro) {
            return "Merkür retroda - iletişimde dikkatli ol, sözleşmeleri ertele.";
        }

        // Venus retrograde
        if (transits.get(3).retrograde()) {
            return "Venüs retroda - eski ilişkiler gündeme gelebilir, duygusal netlik ara.";
        }

        // Moon phase based vibes
        if ("Dolunay".equals(moonPhase)) {
            return moonSign.getTurkishName() + " burcundaki Dolunay ile duygular zirveye çıkıyor, farkındalık günü.";
        }
        if ("Yeni Ay".equals(moonPhase)) {
            return "Yeni Ay enerjisi ile yeni başlangıçlar için mükemmel bir gün.";
        }

        // Element based vibes
        return switch (element) {
            case "Ateş" -> "Ay " + moonSign.getTurkishName() + "'ta - enerji yüksek, cesur adımlar için ideal bir gün.";
            case "Toprak" -> "Ay " + moonSign.getTurkishName() + "'ta - pratik kararlar ve kariyer odağı için güçlü bir gün.";
            case "Hava" -> "Ay " + moonSign.getTurkishName() + "'ta - iletişim ve sosyal bağlantılar için harika bir gün.";
            case "Su" -> "Ay " + moonSign.getTurkishName() + "'ta - sezgiler güçlü, iç sesinizi dinleyin.";
            default -> "Kozmik enerjiler dengeleniyor, akışa güven.";
        };
    }

    private ZodiacSign mapToZodiacSign(String englishSign) {
        try {
            return ZodiacSign.valueOf(englishSign.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ZodiacSign.UNKNOWN;
        }
    }
}
