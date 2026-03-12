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
 * Outputs are locale-aware (tr/en) and score-balanced so low scores surface more cautions.
 */
@Service
public class CosmicActionEngineService {

    private static final Map<String, List<String>> COLOR_BY_MOON_SIGN_TR = Map.ofEntries(
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

    private static final Map<String, List<String>> COLOR_BY_MOON_SIGN_EN = Map.ofEntries(
            Map.entry("Aries", List.of("Red", "Orange")),
            Map.entry("Taurus", List.of("Green", "Brown")),
            Map.entry("Gemini", List.of("Yellow", "Turquoise")),
            Map.entry("Cancer", List.of("White", "Silver")),
            Map.entry("Leo", List.of("Gold", "Orange")),
            Map.entry("Virgo", List.of("Olive", "Earth Tones")),
            Map.entry("Libra", List.of("Pink", "Light Blue")),
            Map.entry("Scorpio", List.of("Burgundy", "Black")),
            Map.entry("Sagittarius", List.of("Purple", "Navy")),
            Map.entry("Capricorn", List.of("Gray", "Anthracite")),
            Map.entry("Aquarius", List.of("Electric Blue", "Turquoise")),
            Map.entry("Pisces", List.of("Sea Green", "Lavender"))
    );

    private static final Map<String, List<String>> AVOID_COLOR_BY_MOON_SIGN_TR = Map.ofEntries(
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

    private static final Map<String, List<String>> AVOID_COLOR_BY_MOON_SIGN_EN = Map.ofEntries(
            Map.entry("Aries", List.of("Heavy Black")),
            Map.entry("Taurus", List.of("Overly Neon Tones")),
            Map.entry("Gemini", List.of("Dark Brown")),
            Map.entry("Cancer", List.of("Harsh Red")),
            Map.entry("Leo", List.of("Matte Gray")),
            Map.entry("Virgo", List.of("Overly Bright Neon")),
            Map.entry("Libra", List.of("Muddy Tones")),
            Map.entry("Scorpio", List.of("Faded White")),
            Map.entry("Sagittarius", List.of("Flat Gray")),
            Map.entry("Capricorn", List.of("Excessive Pink")),
            Map.entry("Aquarius", List.of("Dull Brown")),
            Map.entry("Pisces", List.of("Charcoal Black"))
    );

    public ActionBundle buildActions(
            PlannerCategory category,
            LocalDate date,
            int score,
            List<PlanetaryAspect> aspects,
            List<PlanetPosition> transits,
            String moonPhase,
            boolean mercuryRetrograde,
            String userGender,
            String locale
    ) {
        boolean english = isEnglish(locale);
        String moonPhaseLocalized = localizeMoonPhase(moonPhase, english);

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
        boolean fullMoon = isFullMoon(moonPhase);
        boolean newMoon = isNewMoon(moonPhase);
        boolean waxingMoon = isWaxingMoon(moonPhase);
        boolean waningMoon = isWaningMoon(moonPhase);

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

        boolean highScore = score >= 80;
        boolean veryHighScore = score >= 90;
        boolean lowScore = score < 50;
        boolean veryLowScore = score < 25;

        switch (category) {
            case TRANSIT -> {
                dos.add(t(english,
                        "Transit döngülerini kullanarak günü bloklara ayır (sabah odak, öğlen iletişim, akşam kapanış).",
                        "Use transit cycles to split the day into blocks (morning focus, midday communication, evening closure)."));
                dos.add(t(english,
                        "Ay fazı: " + moonPhaseLocalized + ". Gün ritmini bu döngüye göre planla.",
                        "Moon phase: " + moonPhaseLocalized + ". Plan your rhythm around this cycle."));

                if (positiveAspectCount >= 3 && score >= 60) {
                    dos.add(t(english,
                            "Üçgen/sekstil yoğunluğu yüksek: doğum haritasındaki desteklenen alanlarda girişim açılabilir.",
                            "Strong trine/sextile density: open initiatives in natal areas receiving support."));
                    scoreAdjustment += 6;
                    reasons.add(t(english,
                            "Pozitif transit açı kümeleri natal haritadaki destek noktalarını aktive ediyor.",
                            "Positive transit aspect clusters are activating supportive points in the natal chart."));
                }

                if (mercuryRetrograde) {
                    donts.add(t(english,
                            "Merkür retrosunda sözlü anlaşmaları yazılı teyit olmadan bırakma.",
                            "During Mercury retrograde, do not leave verbal agreements without written confirmation."));
                    reasons.add(t(english,
                            "Merkür retrosu iletişim, belge ve zamanlama zincirinde tekrar kontrol ihtiyacını artırır.",
                            "Mercury retrograde increases the need for double-checking communication, documents, and timing."));
                }

                if (hardAspectCount >= 2 || lowScore) {
                    donts.add(t(english,
                            "Kare/karşıt açı baskısında tepkisel karar ve tartışma dozunu yükseltme.",
                            "Under square/opposition pressure, avoid reactive decisions and escalating arguments."));
                    donts.add(t(english,
                            "Natal tetiklenmeler varken aynı anda çok cephede risk alma.",
                            "When natal triggers are active, avoid taking risks on too many fronts at once."));
                    scoreAdjustment -= 7;
                    reasons.add(t(english,
                            "Sert açı yoğunluğu kısa vadeli problem ve dağılma riski yaratıyor.",
                            "Hard aspect density raises short-term friction and scattering risk."));
                }

                if (veryLowScore) {
                    donts.add(t(english,
                            "Retro/sert açı kombinasyonunda kritik lansman ve yüksek baskılı toplantıları ertele.",
                            "Postpone critical launches and high-pressure meetings under retrograde/hard-aspect combinations."));
                }
            }
            case MOON -> {
                dos.add(t(english,
                        "Ay ritmine göre enerji planı yap; duygusal yoğun işleri günün sakin saatlerine yerleştir.",
                        "Plan energy around the lunar rhythm; place emotionally heavy tasks into calmer hours."));

                if (newMoon) {
                    dos.add(t(english,
                            "Yeni Ay: niyet belirleme, başlangıç planı ve tohum atma için güçlü pencere.",
                            "New Moon: a strong window for intentions, launch planning, and planting seeds."));
                    scoreAdjustment += 5;
                    reasons.add(t(english,
                            "Yeni Ay başlangıç enerjisini yükseltiyor.",
                            "The New Moon boosts initiation energy."));
                }
                if (waxingMoon) {
                    dos.add(t(english,
                            "Büyüyen Ay: görünürlük ve gelişim gerektiren işlerde kademeli artış uygula.",
                            "Waxing Moon: apply gradual expansion in tasks that need visibility and growth."));
                }
                if (waningMoon) {
                    dos.add(t(english,
                            "Küçülen Ay: sadeleştirme, temizlik ve yük azaltma işleri için uygun.",
                            "Waning Moon: good for simplification, cleanup, and reducing load."));
                }
                if (fullMoon) {
                    if (highScore) {
                        dos.add(t(english,
                                "Dolunay: sonuç alma, kapanış ve görünür teslimler için değerlendirilebilir.",
                                "Full Moon: can be used for outcomes, closures, and visible deliverables."));
                    }
                    donts.add(t(english,
                            "Dolunayda ani duygusal çıkışla ilişki konuşması başlatma.",
                            "Do not start sensitive relationship talks with emotional impulsiveness during the Full Moon."));
                    scoreAdjustment -= 4;
                    reasons.add(t(english,
                            "Dolunay duygusal amplifikasyon yarattığı için karar kalitesi dalgalanabilir.",
                            "Full Moon amplification can make decision quality fluctuate."));
                }
                if (moonInTaurus && score >= 45) {
                    dos.add(t(english,
                            "Ay Boğa: ev düzeni, bitki bakımı, dekorasyon ve topraklayıcı rutinler destekli.",
                            "Moon in Taurus: home order, plant care, decor, and grounding routines are supported."));
                    reasons.add(t(english,
                            "Ay Boğa burcundayken somut ve düzenli işler daha akıcı ilerler.",
                            "With the Moon in Taurus, practical and structured tasks flow more smoothly."));
                }
                if (lowScore) {
                    donts.add(t(english,
                            "Ay fazı hassasken uyku düzenini bozacak geç saat kararlarına girme.",
                            "When lunar conditions are sensitive, avoid late-night decisions that disrupt sleep rhythm."));
                }
            }
            case DATE -> {
                dos.add(t(english,
                        "Flört/date planını düşük baskılı tut: kısa buluşma, kahve, yürüyüş veya sakin bir etkinlik seç.",
                        "Keep dating plans low-pressure: choose a short meetup, coffee, walk, or a calm activity."));
                dos.add(t(english,
                        "İlk izlenim için sade ama özenli stil, net iletişim ve rahat akış hedefle.",
                        "Aim for a simple but polished style, clear communication, and an easy flow for first impressions."));

                if ((venusJupiterSoft || venusNeptuneTrine) && score >= 60) {
                    dos.add(t(english,
                            "Romantik davet, ilk buluşma veya ilişkiyi yumuşak bir adımla ilerletmek için uygun pencere.",
                            "A favorable window for a romantic invitation, first date, or gently moving a connection forward."));
                    reasons.add(t(english,
                            "Venüs destekli açılar çekim ve sosyal akışta daha sıcak bir atmosfer kuruyor.",
                            "Venus-supported aspects create a warmer atmosphere for attraction and social flow."));
                    scoreAdjustment += 6;
                }
                if ((moonInTaurus || moonInCancer) && score >= 50) {
                    dos.add(t(english,
                            "Sakin mekanlar, lezzet odaklı buluşmalar ve güven hissi veren planlar daha uyumlu çalışır.",
                            "Calm venues, food-centered meetups, and plans that create a sense of safety work better."));
                }
                if (mercuryMarsHard || lowScore) {
                    donts.add(t(english,
                            "İlk buluşmada sert sorgulama, geçmiş hesaplaşması ve ilişkiyi hızlı tanımlama baskısı kurma.",
                            "Avoid harsh questioning, past-accounting, or pressuring a relationship definition on a first date."));
                    donts.add(t(english,
                            "Mesajlaşmada alınganlık ve ani tepkiyle tonu bozma.",
                            "Do not derail the tone with touchiness or impulsive reactions in messaging."));
                    reasons.add(t(english,
                            "Merkür-Mars sertliği iletişimde yanlış anlaşılma ve gereksiz gerilim riskini artırıyor.",
                            "Mercury-Mars friction increases misunderstanding and unnecessary tension risk in communication."));
                    scoreAdjustment -= 7;
                }
                if (fullMoon || veryLowScore) {
                    donts.add(t(english,
                            "Duygusal yükseliş varken eski defter açma veya ilişkiyi kader kararı gibi konuşma.",
                            "Avoid reopening old stories or framing the relationship as a fate-level decision during emotional surges."));
                }
            }
            case MARRIAGE -> {
                dos.add(t(english,
                        "Nişan/nikah/düğün planı için görev listesi, bütçe kalemleri ve takvim senkronizasyonu yap.",
                        "Organize a task list, budget items, and timeline sync for engagement/civil marriage/wedding planning."));
                dos.add(t(english,
                        "Ailelerle iletişimde beklenti ve rol paylaşımını netleştirmek için kısa bir plan çıkar.",
                        "Create a short plan to clarify expectations and role-sharing in family communication."));

                if ((saturnMercurySoft || jupiterSunSoft) && score >= 65) {
                    dos.add(t(english,
                            "Nikah evrakları, düğün sözleşmeleri ve resmi rezervasyonlar için kontrollü ama verimli pencere.",
                            "A controlled yet productive window for civil marriage documents, wedding contracts, and formal reservations."));
                    dos.add(t(english,
                            "Uzun vadeli birliktelik konuşmalarında tarih, bütçe ve öncelikleri somutlaştır.",
                            "Make dates, budget, and priorities concrete in long-term commitment conversations."));
                    reasons.add(t(english,
                            "Satürn-Merkür/Jüpiter destekleri ciddi kararları yapılandırma ve netleştirme gücü veriyor.",
                            "Saturn-Mercury/Jupiter support helps structure and clarify serious decisions."));
                    scoreAdjustment += 7;
                }
                if (mercuryRetrograde || mercuryMarsHard) {
                    donts.add(t(english,
                            "Nikah/düğün sözleşmesi, salon anlaşması veya ödeme planını son kontrolsüz imzalama.",
                            "Do not sign marriage/wedding contracts, venue agreements, or payment plans without a final review."));
                    donts.add(t(english,
                            "Aileler arası hassas konuları sert dil veya acele tarih baskısıyla yönetme.",
                            "Do not manage sensitive family topics with a harsh tone or rushed date pressure."));
                    reasons.add(t(english,
                            "Merkür etkileri resmi detaylar ve iletişim tonunda hata payını büyütüyor.",
                            "Mercury conditions widen error margins in formal details and communication tone."));
                    scoreAdjustment -= 8;
                }
                if (lowScore) {
                    donts.add(t(english,
                            "Düşük uyum gününde geri dönüşü zor tarih/rezervasyon kararlarını bir gün daha düşünmeden kesinleştirme.",
                            "On low-compatibility days, do not finalize hard-to-reverse dates/reservations without an extra review day."));
                }
            }
            case RELATIONSHIP_HARMONY -> {
                dos.add(t(english,
                        "İletişimde önce duygu düzenlemesi sonra konu başlığı yaklaşımını kullan; dinleme süresini uzat.",
                        "Use a regulate-first, topic-second approach in communication and extend listening time."));
                dos.add(t(english,
                        "Günün ilişkisel odağını seç: destek, planlama veya sakin zaman; hepsini aynı anda zorlamayın.",
                        "Choose one relational focus for the day: support, planning, or calm time; do not force all at once."));

                if ((venusJupiterSoft || moonInCancer || moonInPisces) && score >= 55) {
                    dos.add(t(english,
                            "Barışma, yumuşak konuşma, takdir cümleleri ve yakınlık kurma için uygun atmosfer.",
                            "A suitable atmosphere for reconciliation, gentle talks, appreciation, and closeness."));
                    dos.add(t(english,
                            "Eş/partner ile gelecek hafta planı, ev düzeni veya ortak rutinleri konuşmak verimli olabilir.",
                            "It can be productive to discuss next week plans, home rhythm, or shared routines with your partner."));
                    reasons.add(t(english,
                            "Venüs/Ay destekleri duygusal senkron ve empatiyi güçlendiriyor.",
                            "Venus/Moon support strengthens emotional sync and empathy."));
                    scoreAdjustment += 6;
                }
                if (mercuryMarsHard || hardAspectCount >= 2 || lowScore) {
                    donts.add(t(english,
                            "Suçlayıcı dil, eski defter açma ve mesaj üzerinden uzun tartışma başlatma.",
                            "Avoid accusatory language, reopening old issues, and starting long arguments over messages."));
                    donts.add(t(english,
                            "Sinirliyken ilişkiye dair nihai karar konuşması yapma.",
                            "Do not discuss final relationship decisions while angry."));
                    reasons.add(t(english,
                            "Sert Merkür/Mars teması ilişkisel iletişimde hızla savunmaya geçme riskini artırıyor.",
                            "Hard Mercury/Mars themes increase the risk of quickly shifting into defensiveness."));
                    scoreAdjustment -= 7;
                }
                if (fullMoon || veryLowScore) {
                    donts.add(t(english,
                            "Duygusal yoğunlukta 'ya hep ya hiç' konuşmaları ve restleşme dilini büyütme.",
                            "Avoid escalating all-or-nothing conversations and showdown language during emotional intensity."));
                }
            }
            case FAMILY -> {
                dos.add(t(english,
                        "Aile/ev düzeni için kısa gündem oluştur: alışveriş, görev paylaşımı, ziyaret ve rutinleri sırala.",
                        "Create a short family/home agenda: sequence shopping, role-sharing, visits, and routines."));
                dos.add(t(english,
                        "Ev içi iletişimde beklentileri net ama yumuşak ifade et; küçük düzenlemeler daha iyi sonuç verir.",
                        "Express expectations clearly but gently at home; small adjustments work better."));

                if ((moonInTaurus || moonInCancer) && score >= 50) {
                    dos.add(t(english,
                            "Ev düzeni, dekorasyon, birlikte yemek planı ve bakım/şefkat temalı aile aktiviteleri destekli.",
                            "Home organization, decor, shared meal planning, and care-oriented family activities are supported."));
                    reasons.add(t(english,
                            "Ay'ın toprak/su vurgusu aile ve ev temalarını daha akıcı hale getiriyor.",
                            "Earth/water Moon emphasis makes family and home themes flow more smoothly."));
                    scoreAdjustment += 4;
                }
                if (saturnMercurySoft && score >= 60) {
                    dos.add(t(english,
                            "Aile içi resmi işler (okul, randevu, belge takibi) için net planlama yapılabilir.",
                            "Good for clear planning of family-related formal tasks (school, appointments, document follow-up)."));
                }
                if (mercuryRetrograde) {
                    donts.add(t(english,
                            "Aile buluşma saatlerini ve adres detaylarını teyitsiz bırakma.",
                            "Do not leave family meetup times and address details unconfirmed."));
                }
                if (lowScore || hardAspectCount >= 2) {
                    donts.add(t(english,
                            "Ev içinde eleştiri dozunu yükseltme; küçük konuları kişiselleştirme.",
                            "Do not raise criticism levels at home or personalize small issues."));
                    donts.add(t(english,
                            "Aynı güne fazla misafir/ziyaret sıkıştırıp gerginlik yaratma.",
                            "Avoid packing too many guests/visits into one day and creating tension."));
                    scoreAdjustment -= 5;
                }
            }
            case FINANCE -> {
                dos.add(t(english,
                        "Bütçe gözden geçirme, ödeme planı, harcama sınıflandırması ve nakit akışı takibi yap.",
                        "Review budget, payment planning, spending categories, and cashflow tracking."));
                dos.add(t(english,
                        "Planlı alım için fiyat karşılaştırması ve ihtiyaç/istek ayrımı yap.",
                        "For planned purchases, compare prices and separate needs from wants."));

                if ((saturnMercurySoft || jupiterSunSoft) && score >= 60) {
                    dos.add(t(english,
                            "Tasarruf hedefi, borç yapılandırma planı ve uzun vadeli finans çerçevesi kurmak için uygun pencere.",
                            "A favorable window for setting savings goals, debt restructuring plans, and a long-term finance framework."));
                    dos.add(t(english,
                            "Finansal belge/teklif karşılaştırmalarını tabloya dökerek net karar zemini oluştur.",
                            "Turn financial document/offer comparisons into a table to build a clearer decision base."));
                    reasons.add(t(english,
                            "Satürn-Merkür/Jüpiter desteği finansal planlamada disiplin ve perspektif sağlar.",
                            "Saturn-Mercury/Jupiter support adds discipline and perspective to financial planning."));
                    scoreAdjustment += 6;
                }
                if (mercuryRetrograde || mercuryMarsHard) {
                    donts.add(t(english,
                            "Dürtüsel harcama, acele yatırım kararı veya teknik detayı okunmamış ödeme/sözleşme yapma.",
                            "Avoid impulsive spending, rushed investment decisions, or payments/contracts without reading technical details."));
                    donts.add(t(english,
                            "IBAN/tutar/taksit detaylarını ikinci kontrol olmadan onaylama.",
                            "Do not approve IBAN/amount/installment details without a second check."));
                    reasons.add(t(english,
                            "Merkür temalı baskılar finansal iletişim ve belge detaylarında hata riskini yükseltiyor.",
                            "Mercury-related pressure raises error risk in financial communication and document details."));
                    scoreAdjustment -= 8;
                }
                if (lowScore) {
                    donts.add(t(english,
                            "Düşük uyum gününde yüksek riskli kaldıraç, borçlanma veya büyük alışverişe girme.",
                            "On low-compatibility days, avoid high-risk leverage, borrowing, or major purchases."));
                }
            }
            case BEAUTY -> {
                boolean male = isMale(userGender);

                if (male) {
                    dos.add(t(english,
                            "Berber, tıraş, sakal çizgisi düzeltme ve saç/sakal bakım rutini güncellemesi için uygun pencere.",
                            "Good window for barber visits, shaving, beard line shaping, and grooming routine refresh."));
                    dos.add(t(english,
                            "Cilt temizliği, gözenek bakımı ve erkek bakım ürünlerini yenilemek için plan yap.",
                            "Plan skin cleansing, pore care, and restocking men's grooming products."));
                } else {
                    dos.add(t(english,
                            "Saç bakım döngüsü, epilasyon planı ve cilt yenileme rutinini düzenlemek için uygun gün.",
                            "Good day to organize hair-care cycles, epilation planning, and skin renewal routines."));
                    dos.add(t(english,
                            "Makyaj/estetik denemelerinde yumuşak ve geri dönüşü kolay uygulamalar tercih edilebilir.",
                            "Soft, reversible beauty/makeup experiments can work well today."));
                }

                if (venusNeptuneTrine && score >= 60) {
                    dos.add(t(english,
                            "Venüs-Neptün üçgeni: sanatsal bakım, saç boyatma ve estetik dokunuşlar destekleniyor.",
                            "Venus trine Neptune: artistic beauty care, hair coloring, and aesthetic touches are supported."));
                    dos.add(t(english,
                            "Dövme silme gibi aşamalı işlemlerde seans planı yapılabilir.",
                            "Session planning for staged processes like tattoo removal is favorable."));
                    reasons.add(t(english,
                            "Venüs-Neptün uyumu estetik algı ve zarif sonuç alma potansiyelini artırıyor.",
                            "Venus-Neptune harmony improves aesthetic perception and graceful outcomes."));
                    scoreAdjustment += 8;
                }
                if (venusJupiterSoft && score >= 55) {
                    dos.add(t(english,
                            "Venüs-Jüpiter desteği: saç/sakal kesimi, cilt bakımı ve stil güncellemesi verimli olabilir.",
                            "Venus-Jupiter support: haircut/beard trim, skin care, and style updates can be productive."));
                    dos.add(t(english,
                            "Tırnak bakımı ve küçük görünüm dokunuşları için uyumlu bir gün.",
                            "A harmonious day for nail care and small appearance touch-ups."));
                    reasons.add(t(english,
                            "Venüs-Jüpiter uyumu bakım süreçlerinde konfor ve memnuniyet etkisini artırır.",
                            "Venus-Jupiter harmony increases comfort and satisfaction in care routines."));
                    scoreAdjustment += 4;
                }

                if (mercuryMarsHard || lowScore) {
                    donts.add(t(english,
                            "Ağır kimyasal işlem, kalıcı estetik müdahale veya acele görünüm değişimi planlama.",
                            "Avoid heavy chemical processing, permanent aesthetic procedures, or rushed appearance changes."));
                    donts.add(t(english,
                            "Paket/işlem satın alırken ikinci görüş almadan karar verme.",
                            "Do not commit to treatment packages without a second opinion."));
                    reasons.add(t(english,
                            "Merkür-Mars sertliği acele karar ve memnuniyetsizlik riskini yükseltiyor.",
                            "Mercury-Mars hard aspects raise rushed-decision and dissatisfaction risk."));
                    scoreAdjustment -= 6;
                }
                if (fullMoon || veryLowScore) {
                    donts.add(t(english,
                            "Dolunay veya düşük uyum günlerinde agresif bakım/prosedürleri ertele, cildi sakin tut.",
                            "On Full Moon or low-compatibility days, postpone aggressive procedures and keep the skin calm."));
                }
            }
            case HEALTH -> {
                if (score >= 70) {
                    dos.add(t(english,
                            "Hafif detoks, su dengesi, uyku düzeni ve beslenme planını güçlendirmek için iyi gün.",
                            "Good day to strengthen hydration, sleep routine, light detox, and nutrition planning."));
                    dos.add(t(english,
                            "Kontrol/tahlil, diş veya branş randevularını planlamak/veri toplamak için uygun.",
                            "Good for planning/collecting data for checkups, labs, dental, or specialist appointments."));
                } else {
                    dos.add(t(english,
                            "Sağlık tarafında düşük tempolu bakım ve takip odaklı ilerle.",
                            "Keep health actions low intensity and follow-up oriented today."));
                }

                if (jupiterSunSoft && score >= 60) {
                    dos.add(t(english,
                            "Jüpiter-Güneş desteği: diyet programı başlangıcı ve sağlık hedefi revizyonu için güçlü pencere.",
                            "Jupiter-Sun support: a strong window to start a diet plan or revise health goals."));
                    reasons.add(t(english,
                            "Jüpiter-Güneş uyumu iyileşme motivasyonunu ve pozitif disiplini artırıyor.",
                            "Jupiter-Sun harmony supports recovery motivation and positive discipline."));
                    scoreAdjustment += 5;
                }

                if (marsSaturnHard || fullMoon || lowScore) {
                    donts.add(t(english,
                            "Yüksek yoğunluklu antrenman, bedeni zorlayan yükleme ve invaziv işlemleri ertele.",
                            "Postpone high-intensity workouts, physical overload, and invasive procedures."));
                    donts.add(t(english,
                            "Ani tedavi/ilaç düzeni değişikliklerini doktor teyidi olmadan yapma.",
                            "Do not change treatment/medication routines without medical confirmation."));
                    reasons.add(t(english,
                            "Mars-Satürn sertliği ve/veya düşük skor fiziksel stres eşiğini yükseltiyor.",
                            "Mars-Saturn pressure and/or a low score raises the physical stress threshold risk."));
                    scoreAdjustment -= 7;
                }
                if (veryLowScore) {
                    donts.add(t(english,
                            "Uyku, hidrasyon ve toparlanma sinyallerini görmezden gelme.",
                            "Do not ignore sleep, hydration, and recovery signals."));
                }
            }
            case ACTIVITY -> {
                if (score >= 70) {
                    dos.add(t(english,
                            "Uyumlu aktiviteler: ev işleri, temizlik, alışveriş, kültürel etkinlik, kısa sosyal planlar.",
                            "Suitable activities: home tasks, cleaning, shopping, cultural events, and short social plans."));
                    dos.add(t(english,
                            "Spa/masaj, hamam/sauna veya rahatlatıcı bakım aktiviteleri değerlendirilebilir.",
                            "Spa/massage, hammam/sauna, or relaxing care activities are suitable."));
                } else {
                    dos.add(t(english,
                            "Düşük uyum gününde düşük yoğunluklu aktiviteler seç: kısa yürüyüş, düzenleme, hafif alışveriş.",
                            "On low-compatibility days choose low-intensity activities: short walks, organizing, light shopping."));
                }

                dos.add(t(english,
                        "Tamir/onarım, ev düzeni ve yapılacaklar listesini gruplandırarak tamamla.",
                        "Batch repair/maintenance, home organization, and to-do items for smoother completion."));

                if (moonInTaurus && score >= 45) {
                    dos.add(t(english,
                            "Ay Boğa: bahçe işleri, bitki bakımı ve dekorasyon adımları destekleniyor.",
                            "Moon in Taurus: gardening, plant care, and decor tasks are supported."));
                    reasons.add(t(english,
                            "Ay Boğa'da ev ve toprak temalı aktiviteler daha akıcı ilerler.",
                            "With Moon in Taurus, home and earth-themed activities flow better."));
                    scoreAdjustment += 4;
                }
                if (moonInPisces && score >= 50) {
                    dos.add(t(english,
                            "Ay Balık: yaratıcı, dinlendirici ve su temalı aktiviteler daha uyumlu çalışır.",
                            "Moon in Pisces: creative, restorative, and water-related activities work better."));
                }
                if (positiveAspectCount >= 2 && score >= 60) {
                    dos.add(t(english,
                            "Eğlence/sanatsal etkinlik, iş-sosyal buluşma ve planlı sosyalleşme için uygun pencere.",
                            "Good window for entertainment/art events, business-social meetups, and planned socializing."));
                }
                if (mercuryMarsHard) {
                    donts.add(t(english,
                            "Elektronik alışverişte teknik detayları kontrol etmeden ödeme yapma.",
                            "Do not pay for electronics before double-checking technical details."));
                    donts.add(t(english,
                            "Online tartışma ve sert mesajlaşmalar aktivite akışını bozabilir.",
                            "Online arguments and sharp messaging can disrupt your activity flow."));
                    reasons.add(t(english,
                            "Merkür-Mars sertleşmesi iletişim kazası ve yanlış seçim riskini artırıyor.",
                            "Mercury-Mars friction increases communication mistakes and poor-choice risk."));
                    scoreAdjustment -= 5;
                }
                if (lowScore) {
                    donts.add(t(english,
                            "Yüksek yoğunluklu spor, maceralı aktivite ve aşırı kalabalık programlardan uzak dur.",
                            "Avoid high-intensity exercise, risky activities, and overloaded schedules."));
                }
                if (hardAspectCount >= 3 || veryLowScore) {
                    donts.add(t(english,
                            "Doğa sporları ve maceralı aktivitelerde gereksiz risk alma.",
                            "Avoid unnecessary risk in outdoor and adventure activities."));
                }
            }
            case OFFICIAL -> {
                dos.add(t(english,
                        "Evrak ve başvurular için kontrol listesi oluştur; tarih, isim ve belge no doğrulaması yap.",
                        "Create a checklist for documents/applications; verify dates, names, and document numbers."));

                if ((jupiterSunSoft || saturnMercurySoft) && score >= 65) {
                    dos.add(t(english,
                            "Resmi başvuru, eğitim/hukuk işlemleri ve finansal yapılandırmalar için uygun pencere.",
                            "Favorable window for official applications, education/legal tasks, and financial structuring."));
                    dos.add(t(english,
                            "Tez/araştırma dosyası, girişim başvurusu ve uzun vadeli resmi planları ilerlet.",
                            "Advance thesis/research files, venture applications, and long-term official plans."));
                    reasons.add(t(english,
                            "Satürn/Merkür ve Jüpiter destekleri resmi süreçlerde istikrar ve netlik sağlar.",
                            "Saturn/Mercury and Jupiter support add stability and clarity to formal processes."));
                    scoreAdjustment += 6;
                }

                if (score < 55) {
                    donts.add(t(english,
                            "Düşük uyum gününde kritik imza, resmi başvuru gönderimi ve sert müzakereyi ertele.",
                            "On low-compatibility days, postpone critical signatures, major submissions, and harsh negotiations."));
                    donts.add(t(english,
                            "Belgeyi tek kontrolle göndermeyin; ikinci doğrulama olmadan süreci kapatma.",
                            "Do not send documents after a single review; avoid closing steps without a second verification."));
                }

                if (mercuryRetrograde || mercuryMarsHard) {
                    donts.add(t(english,
                            "Sözleşme imzalama ve kritik başvuruları son kontrol olmadan tamamlama.",
                            "Do not complete contracts or critical applications without a final review."));
                    donts.add(t(english,
                            "Hukuki/restleşmeli iletişimde dil sertliğini artırma.",
                            "Do not escalate tone in legal or confrontational communication."));
                    reasons.add(t(english,
                            "Merkür etkileri evrak, iletişim ve takvim tarafında hata payını yükseltiyor.",
                            "Mercury conditions increase error margins in paperwork, communication, and scheduling."));
                    scoreAdjustment -= 8;
                }
            }
            case SPIRITUAL -> {
                if (score >= 65) {
                    dos.add(t(english,
                            "Dua, ibadet, meditasyon, nefes çalışması ve niyet günlüğü için güçlü bir alan var.",
                            "There is a strong field for prayer, meditation, breathwork, and intention journaling."));
                    dos.add(t(english,
                            "Şifa çalışmaları, içe dönüş ve sessiz ritüeller daha derin çalışabilir.",
                            "Healing work, introspection, and quiet rituals can go deeper today."));
                } else {
                    dos.add(t(english,
                            "Manevi tarafta kısa ve sade pratikler seç; enerjiyi zorlamadan merkezde kal.",
                            "Choose short, simple spiritual practices and stay centered without forcing intensity."));
                }

                if (moonInPisces || moonInCancer || newMoon) {
                    dos.add(t(english,
                            "Su elementi/Ay etkisi sezgiyi artırıyor; dua ve meditasyonda içgörü yakalanabilir.",
                            "Water-element lunar conditions boost intuition; prayer and meditation may bring insight."));
                    reasons.add(t(english,
                            "Ay'ın su elementindeki hareketi manevi farkındalığı yükseltiyor.",
                            "The Moon moving through water signs increases spiritual sensitivity."));
                    scoreAdjustment += 5;
                }
                if (fullMoon && score >= 55) {
                    dos.add(t(english,
                            "Dolunayda kapanış, affetme ve anma/şifa ritüelleri için uygun bir pencere oluşabilir.",
                            "Full Moon can support closure, forgiveness, and remembrance/healing rituals."));
                }
                if (hardAspectCount >= 3 || lowScore) {
                    donts.add(t(english,
                            "Kalabalık, gürültü ve yoğun sosyal akışta enerjini tüketme.",
                            "Avoid draining your energy in crowds, noise, and high social flow."));
                    donts.add(t(english,
                            "Duygusal tetikleyicilere anlık tepki verip manevi pratiği bölme.",
                            "Do not let emotional triggers interrupt your spiritual practice."));
                    scoreAdjustment -= 4;
                }
            }
            case COLOR -> {
                List<String> colors = (english ? COLOR_BY_MOON_SIGN_EN : COLOR_BY_MOON_SIGN_TR)
                        .getOrDefault(moonSign, english ? List.of("Green", "Blue") : List.of("Yeşil", "Mavi"));
                List<String> avoid = (english ? AVOID_COLOR_BY_MOON_SIGN_EN : AVOID_COLOR_BY_MOON_SIGN_TR)
                        .getOrDefault(moonSign, english ? List.of("Overly Dark Tones") : List.of("Aşırı Koyu Tonlar"));

                dos.add(t(english,
                        "Bugün destekleyici renk paleti: " + String.join(", ", colors) + ".",
                        "Supportive color palette today: " + String.join(", ", colors) + "."));
                dos.add(t(english,
                        "Giyim/aksesuar/dekorasyonda bu tonları vurgu olarak kullan.",
                        "Use these tones as accents in clothing/accessories/decor."));
                donts.add(t(english,
                        "Kaçınılması önerilen tonlar: " + String.join(", ", avoid) + ".",
                        "Suggested tones to avoid: " + String.join(", ", avoid) + "."));
                if (fullMoon) {
                    dos.add(t(english,
                            "Dolunay dengesi için beyaz/gümüş dokunuşlar dengeleyici olabilir.",
                            "White/silver accents may feel balancing under the Full Moon."));
                }
                reasons.add(t(english,
                        "Ay burcu renk rezonansı ruh hali ve sosyal tonu dengelemeye yardım eder.",
                        "Moon-sign color resonance can help balance mood and social tone."));
                scoreAdjustment += 3;
            }
            case RECOMMENDATIONS -> {
                if (score >= 80) {
                    dos.add(t(english,
                            "Bugün ana hedef için yüksek etkili adımı öne al; zamanı bloklayarak ilerle.",
                            "Prioritize one high-impact move for your main goal and time-block it."));
                    dos.add(t(english,
                            "Olumlu pencereyi değerlendir: görünür çıktı, başvuru veya önemli görüşme yapılabilir.",
                            "Use the favorable window for a visible output, application, or important meeting."));
                    dos.add(t(english,
                            "Enerji yüksekken dağılmamak için tek odak + kısa mola ritmi kullan.",
                            "Use single-focus + short breaks to avoid scattering while energy is high."));
                    donts.add(t(english,
                            "Yüksek skora güvenip kontrol adımlarını tamamen atlama.",
                            "Do not skip validation steps just because the score is high."));
                    reasons.add(t(english,
                            "Genel kozmik skor yüksek; ivme yakalamak için uygun bir gün.",
                            "The overall cosmic score is high, making it a good day to build momentum."));
                    scoreAdjustment += 4;
                } else if (score < 50) {
                    dos.add(t(english,
                            "Bugünü hazırlık, revizyon ve risk azaltma günü olarak kullan.",
                            "Use today for preparation, revision, and risk reduction."));
                    donts.add(t(english,
                            "Büyük riskli karar, yüksek tutarlı harcama ve geri dönüşü zor taahhütleri ertele.",
                            "Postpone high-risk decisions, large spending, and hard-to-reverse commitments."));
                    donts.add(t(english,
                            "Duygusal dalgalanma ile finansal/ilişkisel hamle yapma.",
                            "Avoid financial or relational moves driven by emotional swings."));
                    donts.add(t(english,
                            "Her işi aynı güne sıkıştırıp hata oranını artırma.",
                            "Do not cram everything into one day and raise error rates."));
                    reasons.add(t(english,
                            "Düşük skorda koruma modu ve dikkat odaklı plan daha sağlıklı sonuç verir.",
                            "At low scores, a protective and caution-oriented plan yields better outcomes."));
                    scoreAdjustment -= 4;
                } else {
                    dos.add(t(english,
                            "Hazırlık, kalite kontrol ve netleştirme işleri için dengeli tempo kullan.",
                            "Use a balanced tempo for preparation, QA checks, and clarifications."));
                    dos.add(t(english,
                            "Kararları küçük parçalara bölerek ilerle; tek seferde büyük taahhüt verme.",
                            "Break decisions into smaller steps; avoid large commitments in one go."));
                    donts.add(t(english,
                            "Yarı hazır veriyle acele karar verme.",
                            "Avoid rushed decisions with half-prepared information."));
                }
            }
        }

        if (mercuryRetrograde && category != PlannerCategory.SPIRITUAL) {
            donts.add(t(english,
                    "Yanlış anlaşılmaya açık mesajları göndermeden önce tekrar gözden geçir.",
                    "Re-check messages that may be easily misunderstood before sending."));
        }

        if (dos.isEmpty()) {
            dos.add(t(english,
                    "Planlı ve kademeli ilerleme stratejisini koru.",
                    "Stay with a planned, incremental execution strategy."));
        }
        if (donts.isEmpty()) {
            donts.add(t(english,
                    "Ani ve hazırlıksız karar alma eğiliminden uzak dur.",
                    "Avoid sudden, underprepared decisions."));
        }
        if (reasons.isEmpty()) {
            reasons.add(t(english,
                    "Transit-natal etkileşimleri bu kategoride temkinli ama yönetilebilir bir akış gösteriyor.",
                    "Transit-natal interactions suggest a cautious but manageable flow in this category."));
        }

        String reasoning = reasons.stream()
                .distinct()
                .limit(score >= 70 ? 2 : 3)
                .collect(Collectors.joining(" "));

        BalancedActionLists balanced = balanceByScore(category, score, dos, donts, english);

        return new ActionBundle(
                balanced.dos(),
                balanced.donts(),
                reasoning,
                scoreAdjustment
        );
    }

    private BalancedActionLists balanceByScore(
            PlannerCategory category,
            int score,
            Set<String> dos,
            Set<String> donts,
            boolean english
    ) {
        int dosLimit;
        int dontsLimit;
        int minDos;
        int minDonts;

        if (score >= 90) {
            dosLimit = 5; dontsLimit = 1; minDos = 3; minDonts = 1;
        } else if (score >= 75) {
            dosLimit = 5; dontsLimit = 2; minDos = 3; minDonts = 1;
        } else if (score >= 60) {
            dosLimit = 4; dontsLimit = 3; minDos = 2; minDonts = 2;
        } else if (score >= 40) {
            dosLimit = 3; dontsLimit = 4; minDos = 2; minDonts = 3;
        } else if (score >= 20) {
            dosLimit = 2; dontsLimit = 5; minDos = 1; minDonts = 4;
        } else {
            dosLimit = 1; dontsLimit = 5; minDos = 1; minDonts = 5;
        }

        List<String> dosList = new ArrayList<>(dos);
        List<String> dontsList = new ArrayList<>(donts);

        while (dosList.size() < minDos) {
            String fallback = score >= 50
                    ? t(english,
                    "Adımları sırala ve tek bir önceliğe odaklan.",
                    "Sequence your steps and focus on one priority.")
                    : t(english,
                    "Büyük adım yerine küçük ve geri dönüşü kolay bir adım seç.",
                    "Choose a small, reversible step instead of a big move.");
            addIfMissing(dosList, fallback);
        }

        while (dontsList.size() < minDonts) {
            addIfMissing(dontsList, genericCaution(category, score, english));
        }

        return new BalancedActionLists(
                dosList.stream().limit(dosLimit).toList(),
                dontsList.stream().limit(dontsLimit).toList()
        );
    }

    private String genericCaution(PlannerCategory category, int score, boolean english) {
        if (score < 30) {
            return switch (category) {
                case DATE -> t(english,
                        "İlişkisel iletişimde acele karar yerine yavaş ve net ilerleyin.",
                        "Move slowly and clearly in dating communication instead of making rushed decisions.");
                case MARRIAGE -> t(english,
                        "Evlilik/taahhüt planlarında detay teyidi olmadan nihai karar vermeyin.",
                        "Do not make final marriage/commitment decisions without verifying the details.");
                case RELATIONSHIP_HARMONY -> t(english,
                        "Tartışma büyürse konuyu zamana yayın; kırıcı dil kullanmayın.",
                        "If tension grows, spread the conversation over time and avoid hurtful language.");
                case FAMILY -> t(english,
                        "Ev/aile gündemini sade tutun; aynı gün çok konu yüklemeyin.",
                        "Keep the home/family agenda simple; do not overload one day with too many topics.");
                case FINANCE -> t(english,
                        "Finansal kararları ikinci kontrol ve soğuma süresi olmadan kesinleştirmeyin.",
                        "Do not finalize financial decisions without a second review and a cooling-off period.");
                case ACTIVITY -> t(english,
                        "Bugünü düşük yoğunlukta tut; programı gereksiz kalabalıklaştırma.",
                        "Keep the day low intensity; avoid overloading the schedule.");
                case OFFICIAL -> t(english,
                        "Kritik resmi süreçleri ikinci teyit olmadan kapatma.",
                        "Do not close critical formal processes without a second confirmation.");
                case BEAUTY -> t(english,
                        "Cildi/saçı yoran agresif işlemler yerine bakım odaklı kal.",
                        "Stay with maintenance-focused care instead of aggressive skin/hair procedures.");
                case HEALTH -> t(english,
                        "Toparlanma sinyallerini zorlamayın; bedeni aşırı yüklemeyin.",
                        "Do not override recovery signals; avoid overloading the body.");
                default -> t(english,
                        "Düşük uyum gününde geri dönüşü zor kararları ertele.",
                        "On low-compatibility days, postpone hard-to-reverse decisions.");
            };
        }

        return t(english,
                "Detay, zamanlama ve iletişim doğrulamasını atlama.",
                "Do not skip detail, timing, and communication checks.");
    }

    private void addIfMissing(List<String> list, String value) {
        if (!list.contains(value)) {
            list.add(value);
        }
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

    private boolean isEnglish(String locale) {
        return locale != null && locale.toLowerCase().startsWith("en");
    }

    private boolean isMale(String userGender) {
        if (userGender == null) return false;
        String g = userGender.trim().toLowerCase();
        return g.equals("male") || g.equals("m") || g.equals("erkek") || g.equals("man");
    }

    private boolean isFullMoon(String phase) {
        String p = normalizePhase(phase);
        return p.contains("dolunay") || p.contains("full moon");
    }

    private boolean isNewMoon(String phase) {
        String p = normalizePhase(phase);
        return p.contains("yeni ay") || p.contains("new moon");
    }

    private boolean isWaxingMoon(String phase) {
        String p = normalizePhase(phase);
        return p.contains("büyüyen") || p.contains("waxing");
    }

    private boolean isWaningMoon(String phase) {
        String p = normalizePhase(phase);
        return p.contains("küçülen") || p.contains("waning");
    }

    private String normalizePhase(String phase) {
        return phase == null ? "" : phase.toLowerCase();
    }

    private String localizeMoonPhase(String phase, boolean english) {
        if (phase == null) return english ? "Moon Phase" : "Ay Fazı";
        if (!english) return phase;
        return switch (phase) {
            case "Yeni Ay" -> "New Moon";
            case "Hilal (Büyüyen)" -> "Waxing Crescent";
            case "İlk Dördün" -> "First Quarter";
            case "Şişkin Ay (Büyüyen)" -> "Waxing Gibbous";
            case "Dolunay" -> "Full Moon";
            case "Şişkin Ay (Küçülen)" -> "Waning Gibbous";
            case "Son Dördün" -> "Last Quarter";
            case "Hilal (Küçülen)" -> "Waning Crescent";
            default -> phase;
        };
    }

    private String t(boolean english, String tr, String en) {
        return english ? en : tr;
    }

    public record ActionBundle(
            List<String> dos,
            List<String> donts,
            String reasoning,
            int scoreAdjustment
    ) {}

    private record BalancedActionLists(
            List<String> dos,
            List<String> donts
    ) {}
}
