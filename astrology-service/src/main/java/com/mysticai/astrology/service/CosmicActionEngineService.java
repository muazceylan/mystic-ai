package com.mysticai.astrology.service;

import com.mysticai.astrology.dto.PlanetPosition;
import com.mysticai.astrology.dto.PlanetaryAspect;
import com.mysticai.astrology.dto.PlannerCategory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Maps transit/natal signals to actionable Do/Don't suggestions.
 */
@Service
public class CosmicActionEngineService {

    private static final Map<String, List<String>> COLOR_BY_MOON_SIGN = Map.ofEntries(
            Map.entry("Aries", List.of("Kırmızı", "Turuncu")),
            Map.entry("Taurus", List.of("Yeşil", "Kahve")),
            Map.entry("Gemini", List.of("Sarı", "Turkuaz")),
            Map.entry("Cancer", List.of("Beyaz", "Gümüş")),
            Map.entry("Leo", List.of("Altın", "Turuncu")),
            Map.entry("Virgo", List.of("Zeytin", "Toprak Tonları")),
            Map.entry("Libra", List.of("Pembe", "Açık Mavi")),
            Map.entry("Scorpio", List.of("Bordo", "Siyah")),
            Map.entry("Sagittarius", List.of("Mor", "Lacivert")),
            Map.entry("Capricorn", List.of("Gri", "Antrasit")),
            Map.entry("Aquarius", List.of("Elektrik Mavisi", "Turkuaz")),
            Map.entry("Pisces", List.of("Deniz Yeşili", "Lavanta"))
    );

    private static final Map<String, List<String>> AVOID_COLOR_BY_MOON_SIGN = Map.ofEntries(
            Map.entry("Aries", List.of("Aşırı Siyah")),
            Map.entry("Taurus", List.of("Aşırı Neon Tonlar")),
            Map.entry("Gemini", List.of("Koyu Kahve")),
            Map.entry("Cancer", List.of("Sert Kırmızı")),
            Map.entry("Leo", List.of("Mat Gri")),
            Map.entry("Virgo", List.of("Aşırı Parlak Neon")),
            Map.entry("Libra", List.of("Çamur Tonları")),
            Map.entry("Scorpio", List.of("Soluk Beyaz")),
            Map.entry("Sagittarius", List.of("Durgun Gri")),
            Map.entry("Capricorn", List.of("Aşırı Pembe")),
            Map.entry("Aquarius", List.of("Donuk Kahve")),
            Map.entry("Pisces", List.of("Kömür Siyahı"))
    );

    public ActionBundle buildActions(
            PlannerCategory category,
            LocalDate date,
            int score,
            List<PlanetaryAspect> aspects,
            List<PlanetPosition> transits,
            String moonPhase,
            boolean mercuryRetrograde,
            String userGender
    ) {
        Set<String> dos = new LinkedHashSet<>();
        Set<String> donts = new LinkedHashSet<>();
        List<String> reasons = new ArrayList<>();
        int scoreAdjustment = 0;

        int positiveAspectCount = countAspects(aspects, Set.of(
                PlanetaryAspect.AspectType.TRINE,
                PlanetaryAspect.AspectType.SEXTILE,
                PlanetaryAspect.AspectType.CONJUNCTION
        ));
        int hardAspectCount = countAspects(aspects, Set.of(
                PlanetaryAspect.AspectType.SQUARE,
                PlanetaryAspect.AspectType.OPPOSITION
        ));

        String moonSign = findTransitSign(transits, "Moon");
        boolean moonInTaurus = "Taurus".equalsIgnoreCase(moonSign);
        boolean moonInPisces = "Pisces".equalsIgnoreCase(moonSign);
        boolean moonInCancer = "Cancer".equalsIgnoreCase(moonSign);
        boolean fullMoon = moonPhase != null && moonPhase.toLowerCase().contains("dolunay");
        boolean newMoon = moonPhase != null && moonPhase.toLowerCase().contains("yeni ay");
        boolean waxingMoon = moonPhase != null && moonPhase.toLowerCase().contains("büyüyen");

        boolean venusNeptuneTrine = hasAspectPair(aspects, "Venus", PlanetaryAspect.AspectType.TRINE, "Neptune");
        boolean venusJupiterSoft = hasAnyAspectPair(aspects, "Venus", Set.of(
                PlanetaryAspect.AspectType.TRINE, PlanetaryAspect.AspectType.SEXTILE), "Jupiter");
        boolean mercuryMarsHard = hasAnyAspectPair(aspects, "Mercury", Set.of(
                PlanetaryAspect.AspectType.SQUARE, PlanetaryAspect.AspectType.OPPOSITION), "Mars");
        boolean marsSaturnHard = hasAnyAspectPair(aspects, "Mars", Set.of(
                PlanetaryAspect.AspectType.SQUARE, PlanetaryAspect.AspectType.OPPOSITION), "Saturn");
        boolean jupiterSunSoft = hasAnyAspectPair(aspects, "Jupiter", Set.of(
                PlanetaryAspect.AspectType.TRINE, PlanetaryAspect.AspectType.SEXTILE), "Sun");
        boolean saturnMercurySoft = hasAnyAspectPair(aspects, "Saturn", Set.of(
                PlanetaryAspect.AspectType.TRINE, PlanetaryAspect.AspectType.SEXTILE), "Mercury");

        switch (category) {
            case TRANSIT -> {
                dos.add("Stratejik toplantı ve odak gerektiren işleri günün ilk yarısına al.");
                dos.add("Öncelik matrisini güncelle ve tek ana hedefe odaklan.");
                if (positiveAspectCount >= 3) {
                    dos.add("Yüksek etki yaratacak yeni adım veya lansman için güçlü pencere.");
                    scoreAdjustment += 6;
                    reasons.add("Pozitif transit açıları bugün destekleyici bir akış oluşturuyor.");
                }
                if (hardAspectCount >= 2) {
                    donts.add("Tepkisel kararlar ve restleşme içeren konuşmalardan kaçın.");
                    donts.add("Aynı anda çok fazla cephede risk alma.");
                    scoreAdjustment -= 7;
                    reasons.add("Kare/karşıt açı yoğunluğu kısa vadeli sürtünme riski yaratıyor.");
                }
            }
            case MOON -> {
                if (newMoon) {
                    dos.add("Yeni ay niyeti belirle, 30 günlük plan başlat.");
                    dos.add("Yeni proje tohumlarını at, acele etmeden sistem kur.");
                    scoreAdjustment += 5;
                    reasons.add("Yeni ay fazı başlangıç enerjisini güçlendiriyor.");
                }
                if (fullMoon) {
                    dos.add("Yarım kalan işleri tamamla ve sonuç odaklı kapanış yap.");
                    donts.add("Duygusal yoğunlukla sert tartışma başlatma.");
                    scoreAdjustment -= 4;
                    reasons.add("Dolunay duyguları yükselttiği için ilişkilerde hassasiyet artar.");
                }
                if (waxingMoon) {
                    dos.add("Büyüme gerektiren hedeflerde kademeli ivme oluştur.");
                }
                if (moonInTaurus) {
                    dos.add("Bitki ekimi, dekorasyon ve ev düzenleme için uygun zaman.");
                    reasons.add("Ay Boğa burcundayken topraklayıcı ve somut işlerde verim artar.");
                }
            }
            case BEAUTY -> {
                if (venusNeptuneTrine) {
                    dos.add("Saç boyatma ve sanatsal bakım işlemleri için ideal pencere.");
                    dos.add("Cilt yenileme ve estetik dokunuşlarda doğal sonuç alma olasılığı yüksek.");
                    dos.add("Dövme silme gibi aşamalı işlemlerde seans planı yapmak için verimli gün.");
                    reasons.add("Venüs-Neptün üçgeni estetik algıyı ve yaratıcı dokunuşları destekliyor.");
                    scoreAdjustment += 8;
                }
                if (venusJupiterSoft) {
                    dos.add("Saç/sakal kesimi, cilt bakımı ve stil güncellemesi için verimli gün.");
                    dos.add("Tırnak bakımı ve görünüm odaklı mini dokunuşlar destekleniyor.");
                    reasons.add("Venüs-Jüpiter uyumu bakım süreçlerinde bereket etkisi yaratır.");
                    scoreAdjustment += 4;
                }
                if (mercuryMarsHard) {
                    donts.add("Ağır kimyasal işlem veya kalıcı dövme gibi geri dönüşü zor uygulamalardan kaçın.");
                    donts.add("Aceleyle estetik paketi satın alma; önce ikinci görüş al.");
                    donts.add("Ani görünüm değişimini aceleyle planlama.");
                    reasons.add("Merkür-Mars sert açısı acele karar riskini yükseltiyor.");
                    scoreAdjustment -= 6;
                }
                if (fullMoon) {
                    donts.add("Dolunay günü kalıcı ve agresif estetik müdahaleyi ertele.");
                }
                if (userGender != null && userGender.equalsIgnoreCase("male")) {
                    dos.add("Tıraş, sakal hattı düzeltme ve berber randevusu için dengeli gün.");
                    dos.add("Saç/sakal bakımı ve bakım rutini güncellemesi için uygun zaman.");
                } else {
                    dos.add("Epilasyon ve saç bakım döngüsü için uygun zaman penceresi.");
                    dos.add("Cilt bakımı ve saç/sakal çizgisinde yumuşak düzenleme destekleniyor.");
                }
            }
            case HEALTH -> {
                dos.add("Hafif detoks, su dengesi ve uyku düzeni optimizasyonu uygula.");
                dos.add("Kontrol/tahlil randevularını planlamak için uygun.");
                dos.add("Diyet ve sağlık kontrolü takvimini güncelle.");
                dos.add("Diş, jinekoloji/üroloji gibi branş kontrollerini planla.");
                if (jupiterSunSoft) {
                    dos.add("Diyet programı başlangıcı ve sağlık hedefi revizyonu için güçlü gün.");
                    reasons.add("Jüpiter-Güneş uyumu iyileşme motivasyonunu artırıyor.");
                    scoreAdjustment += 5;
                }
                if (marsSaturnHard || fullMoon) {
                    donts.add("İnvaziv girişim, ağır antrenman ve bedeni zorlayan yüklemelerden kaçın.");
                    donts.add("Ani tedavi değişikliği veya dürtüsel ilaç düzenlemesi yapma.");
                    reasons.add("Mars-Satürn sertliği ve dolunay birlikte fiziksel stres eşiğini artırabilir.");
                    scoreAdjustment -= 7;
                }
            }
            case ACTIVITY -> {
                dos.add("Ev işleri, temizlik ve alışveriş listesi optimizasyonu yap.");
                dos.add("Tamir/onarım ve ev düzeni gerektiren işleri paketleyerek tamamla.");
                if (moonInTaurus) {
                    dos.add("Bahçe işleri, bitki bakımı ve ev dekorasyon adımları için güçlü zaman.");
                    reasons.add("Ay Boğa'da iken ev ve toprak temalı aktiviteler akıcı ilerler.");
                    scoreAdjustment += 4;
                }
                if (moonInPisces) {
                    dos.add("Masaj, spa, hamam/sauna gibi beden gevşetici aktiviteler için uygun.");
                }
                if (positiveAspectCount >= 2) {
                    dos.add("Sosyal etkinlik, spa/masaj veya kültürel aktivite planı yap.");
                    dos.add("Eğlence ve sanatsal etkinlik, parti/eğlence, iş-sosyal buluşmalar destekleniyor.");
                }
                if (mercuryMarsHard) {
                    donts.add("Elektronik alışverişte acele etme, teknik şartları iki kez kontrol et.");
                    donts.add("Online tartışma veya sert yazışmalardan uzak dur.");
                    reasons.add("Merkür-Mars sertleşmesi iletişim kazaları ve yanlış satın alma riskini artırır.");
                    scoreAdjustment -= 5;
                }
                if (hardAspectCount >= 3) {
                    donts.add("Doğa sporları ve maceralı aktivitelerde gereksiz risk alma.");
                }
            }
            case OFFICIAL -> {
                dos.add("Evrak, resmi işler ve başvurular için kontrol listesi oluştur.");
                if (jupiterSunSoft || saturnMercurySoft) {
                    dos.add("Evrak, resmi başvuru, eğitim/hukuk işlemlerini ilerletmek için uygun pencere.");
                    dos.add("Finansal yapılandırma ve uzun vadeli planları resmileştir.");
                    dos.add("Tez/araştırma, başvuru ve girişim dosyalarını tamamlamak için güçlü bir gün.");
                    reasons.add("Jüpiter/Satürn destek açısı resmi süreçlerde istikrar sağlar.");
                    scoreAdjustment += 6;
                } else {
                    dos.add("Süreç takvimi ve belge kontrol listesi oluştur.");
                }
                if (positiveAspectCount >= 3) {
                    dos.add("Nişan/nikah/düğün ve toplantı/davet planlarını netleştirmek için uygun.");
                }
                if (mercuryRetrograde || mercuryMarsHard) {
                    donts.add("Sözleşme imzalama ve kritik başvuruları son kontrol olmadan tamamlama.");
                    donts.add("Sert müzakere ve hukuki restleşmeden kaçın.");
                    reasons.add("Merkür etkisi iletişim ve evrak tarafında hata payını yükseltiyor.");
                    scoreAdjustment -= 8;
                }
            }
            case SPIRITUAL -> {
                dos.add("Dua, ibadet, meditasyon ve nefes çalışmasına zaman ayır.");
                dos.add("Şifa çalışmaları ve içsel kapanış ritüelleri için sessiz alan aç.");
                if (moonInPisces || moonInCancer || newMoon) {
                    dos.add("Niyet günlüğü tut, sezgisel yazım/şifa çalışması yap.");
                    reasons.add("Ay'ın su elementindeki hareketi manevi farkındalığı artırıyor.");
                    scoreAdjustment += 5;
                }
                if (fullMoon) {
                    dos.add("Anma törenleri ve geçmişi onurlandıran manevi çalışmalar için uygun.");
                }
                if (hardAspectCount >= 3) {
                    donts.add("Kalabalık ve gürültülü ortamlarda enerji tüketimini artırma.");
                    donts.add("Duygusal tetikleyicilere hızlı tepki verme.");
                    scoreAdjustment -= 4;
                }
            }
            case COLOR -> {
                List<String> colors = COLOR_BY_MOON_SIGN.getOrDefault(moonSign, List.of("Yeşil", "Mavi"));
                List<String> avoid = AVOID_COLOR_BY_MOON_SIGN.getOrDefault(moonSign, List.of("Aşırı Koyu Tonlar"));

                dos.add("Bugün destekleyici renk paleti: " + String.join(", ", colors) + ".");
                dos.add("Giyim/aksesuar/dekorasyonda bu tonları ana vurgu olarak kullan.");
                donts.add("Kaçınılması önerilen ton: " + String.join(", ", avoid) + ".");
                if (fullMoon) {
                    dos.add("Dolunay dengesi için beyaz ve gümüş tonlarını küçük dokunuşlarla ekle.");
                }
                reasons.add("Ay burcu renk rezonansı ruh hali ve iletişim tonunu dengelemeye yardım eder.");
                scoreAdjustment += 3;
            }
            case RECOMMENDATIONS -> {
                dos.add("Günün ilk 2 saatini en önemli işe ayır, kalan işleri buna göre diz.");
                dos.add("Enerji yönetimi için tek odak + kısa mola ritmi kullan.");

                if (score >= 80) {
                    dos.add("Yılın kritik adımlarından birini bugün başlatmak için uygun pencere.");
                    reasons.add("Genel kozmik puan yüksek; ivme yakalamak için verimli bir gün.");
                    scoreAdjustment += 4;
                } else if (score < 50) {
                    donts.add("Büyük riskli karar ve geri dönüşü zor taahhütleri bugün ertele.");
                    donts.add("Duygusal dalgalanma ile finansal hamle yapma.");
                    reasons.add("Düşük skorda koruma modu daha sağlıklı sonuç verir.");
                    scoreAdjustment -= 4;
                } else {
                    dos.add("Hazırlık, revizyon ve kalite kontrol işleri için ideal tempo.");
                }
            }
        }

        if (mercuryRetrograde && category != PlannerCategory.SPIRITUAL) {
            donts.add("Yanlış anlaşılmaya açık mesajları göndermeden önce tekrar gözden geçir.");
        }

        if (dos.isEmpty()) {
            dos.add("Planlı ve kademeli ilerleme stratejisini koru.");
        }
        if (donts.isEmpty()) {
            donts.add("Ani ve hazırlıksız karar alma eğiliminden uzak dur.");
        }
        if (reasons.isEmpty()) {
            reasons.add("Transit-natal etkileşimleri bu kategoride dengeli ama dikkatli bir akış öneriyor.");
        }

        String reasoning = reasons.stream()
                .distinct()
                .limit(2)
                .collect(Collectors.joining(" "));

        return new ActionBundle(
                dos.stream().limit(5).toList(),
                donts.stream().limit(5).toList(),
                reasoning,
                scoreAdjustment
        );
    }

    private int countAspects(List<PlanetaryAspect> aspects, Set<PlanetaryAspect.AspectType> types) {
        return (int) aspects.stream().filter(aspect -> types.contains(aspect.type())).count();
    }

    private String findTransitSign(List<PlanetPosition> transits, String planet) {
        return transits.stream()
                .filter(pos -> planet.equalsIgnoreCase(pos.planet()))
                .map(PlanetPosition::sign)
                .findFirst()
                .orElse("Cancer");
    }

    private boolean hasAspectPair(
            List<PlanetaryAspect> aspects,
            String planetA,
            PlanetaryAspect.AspectType type,
            String planetB
    ) {
        return aspects.stream().anyMatch(aspect ->
                aspect.type() == type && planetPairMatches(aspect, planetA, planetB));
    }

    private boolean hasAnyAspectPair(
            List<PlanetaryAspect> aspects,
            String planetA,
            Set<PlanetaryAspect.AspectType> types,
            String planetB
    ) {
        return aspects.stream().anyMatch(aspect ->
                types.contains(aspect.type()) && planetPairMatches(aspect, planetA, planetB));
    }

    private boolean planetPairMatches(PlanetaryAspect aspect, String planetA, String planetB) {
        String transit = cleanPlanetName(aspect.planet1());
        String natal = cleanPlanetName(aspect.planet2());
        return (transit.equalsIgnoreCase(planetA) && natal.equalsIgnoreCase(planetB))
                || (transit.equalsIgnoreCase(planetB) && natal.equalsIgnoreCase(planetA));
    }

    private String cleanPlanetName(String value) {
        return value == null ? "" : value.replace("T-", "").replace("N-", "");
    }

    public record ActionBundle(
            List<String> dos,
            List<String> donts,
            String reasoning,
            int scoreAdjustment
    ) {}
}
