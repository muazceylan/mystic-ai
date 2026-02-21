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
        String moonTr = moonSign.getTurkishName();
        String element = moonSign.getElement();
        int dayOfYear = LocalDate.now().getDayOfYear();

        // Mercury retrograde — communication caution (5 variants)
        boolean mercuryRetro = transits.get(2).retrograde();
        if (mercuryRetro) {
            String[] variants = {
                "Merkür retroda — söylemeden önce düşün, imzalamadan önce iki kez oku.",
                "Merkür geriye gidiyor; bugün ne söylediğin kadar nasıl söylediğin de belirleyici.",
                "Merkür retrosu aktif — önemli kararları ertele, teknik aksaklıklara hazırlıklı ol.",
                "İletişim sinyalleri karışık; net olmayan mesajlara yanıt vermeden önce sormaktan çekinme.",
                "Merkür retroda — eski konuşmalar yeniden gündeme gelebilir, dikkatli pozisyon al."
            };
            return variants[dayOfYear % variants.length];
        }

        // Venus retrograde — relationship reflection
        if (transits.get(3).retrograde()) {
            String[] variants = {
                "Venüs retroda — ilişkilerde hız değil derinlik; geçmişi düzelt, geleceği net kur.",
                "Venüs geriye gidiyor; bugün duygusal hesaplaşmalar için doğru zemin.",
                "Venüs retrosu var — kendine değer biçme biçimini sorgulamak için güçlü bir gün."
            };
            return variants[dayOfYear % variants.length];
        }

        // Mars retrograde — action caution
        if (transits.size() > 4 && transits.get(4).retrograde()) {
            return "Mars retroda — zorla değil, stratejik adımlarla ilerle; enerjiyi boşa harcama.";
        }

        // Multiple retrogrades
        if (retrogradePlanets.size() >= 3) {
            return "Gökyüzü yavaşlatıyor — bugün aksiyondan çok gözlem ve planlama günü.";
        }

        // Moon phase-specific vibes
        if ("Dolunay".equals(moonPhase)) {
            String[] variants = {
                moonTr + " Dolunayı'nda duygular zirveye çıkıyor — neyi bırakman gerektiğini biliyorsun.",
                moonTr + " Dolunayı başka bir döngüyü kapatıyor; ne tamamladığını görmek için dur.",
                "Dolunay'da duygular net konuşuyor — bugün sezgine güven, mantık bekleyebilir."
            };
            return variants[dayOfYear % variants.length];
        }
        if ("Yeni Ay".equals(moonPhase)) {
            String[] variants = {
                "Yeni Ay'da bir şeyi ilk kez denemek için gökyüzü tam anlamıyla hazır.",
                "Yeni Ay döngüsü başlıyor — niyet güçlü tutulursa bu hafta ivme kazanır.",
                moonTr + " Yeni Ayı taze bir başlangıç enerjisi getiriyor; ilk adımı bugün at."
            };
            return variants[dayOfYear % variants.length];
        }
        if (moonPhase != null && moonPhase.contains("Son Dördün")) {
            return "Son Dördün — sona erdirme ve bırakma enerjisi güçlü; temizle, hafifle.";
        }
        if (moonPhase != null && moonPhase.contains("İlk Dördün")) {
            return "İlk Dördün — hamleni yapmanın vakti; küçük ama kararlı adım büyük fark yaratır.";
        }

        // Element-based vibes (multiple variants to avoid repetition)
        return switch (element) {
            case "Ateş" -> {
                String[] v = {
                    moonTr + " Ayı ile ateş unsuru aktif — harekete geçmek için bekleme.",
                    "Ateş enerjisi yüksek; cesur karar bu sabah seni öne taşır.",
                    moonTr + " Ayı cesareti besliyor — bugün itiyor olduğun kapıyı it."
                };
                yield v[dayOfYear % v.length];
            }
            case "Toprak" -> {
                String[] v = {
                    moonTr + " Ayı ile pratik adımlar kalıcı iz bırakır — temel at, inşa et.",
                    "Toprak enerjisi sağlam zemin istiyor; bugün planla ve somut karar al.",
                    moonTr + " Ayı ile finans ve kariyer kararları netleşiyor."
                };
                yield v[dayOfYear % v.length];
            }
            case "Hava" -> {
                String[] v = {
                    moonTr + " Ayı ile doğru konuşma, doğru kapıyı açar.",
                    "Hava unsuru zihin keskinliği getiriyor — fikir üret, bağlan, paylaş.",
                    moonTr + " Ayı iletişimi güçlendiriyor; sessiz kalmak bu gece zor olacak."
                };
                yield v[dayOfYear % v.length];
            }
            case "Su" -> {
                String[] v = {
                    moonTr + " Ayı ile sezgiler keskin — mantığın veremediği cevabı hissin verir.",
                    "Su enerjisi derin; bugün yüzeyi değil özü gör.",
                    moonTr + " Ayı duygusal netlik istiyor — hissettiklerini saklamanın zamanı değil."
                };
                yield v[dayOfYear % v.length];
            }
            default -> "Gökyüzü sakin; bugün kendi ritmine güven.";
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
