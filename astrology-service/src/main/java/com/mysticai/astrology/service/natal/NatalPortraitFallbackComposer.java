package com.mysticai.astrology.service.natal;

import com.mysticai.astrology.dto.natal.NatalPortrait;
import com.mysticai.astrology.dto.natal.NormalizedNatalChart;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

/**
 * Builds a complete portrait from chart data alone, with no model in the loop.
 *
 * <p>This exists so the screen is never empty. If the provider is down, times out, or returns
 * something the validator rejects twice, the user still gets an interpretation that is specific to
 * their chart — their actual Moon sign, their actual house, their actual tightest aspect — rather
 * than an error state or generic filler.</p>
 *
 * <p>It composes rather than concatenates: each paragraph is assembled from the placement, the
 * house it lands in, and the chart's overall element/modality weighting, so two different charts
 * produce visibly different text. It is deliberately shorter and plainer than the AI path; the
 * point is dignity in degraded mode, not parity.</p>
 */
@Service
@RequiredArgsConstructor
public class NatalPortraitFallbackComposer {

    private final NatalVocabulary vocab;

    public NatalPortrait compose(NormalizedNatalChart chart, String locale) {
        boolean en = vocab.isEnglish(locale);
        return new NatalPortrait(
                NatalPortraitService.CONTRACT_VERSION,
                locale,
                "FALLBACK",
                buildPortrait(chart, locale, en),
                buildBigThree(chart, locale, en),
                buildAboutMe(chart, locale, en),
                buildLifeAreas(chart, locale, en),
                buildPlanetReadings(chart, locale, en),
                buildHouseReadings(chart, locale, en),
                buildAspectStory(chart, locale, en)
        );
    }

    // ------------------------------------------------------------------ hero

    private NatalPortrait.Portrait buildPortrait(NormalizedNatalChart chart, String locale, boolean en) {
        String sunSign = signOf(chart.sun());
        String moonSign = signOf(chart.moon());
        String risingSign = chart.ascendant() != null ? chart.ascendant().sign() : null;

        String headline = risingSign != null
                ? join(en ? ", " : ", ",
                    cap(vocab.signTraits(sunSign, locale).get(0)),
                    lower(vocab.signTraits(moonSign, locale).get(0)),
                    (en ? "and a " : "ve ")
                        + lower(vocab.signTraits(risingSign, locale).get(0))
                        + (en ? " first impression" : " bir ilk izlenim"))
                : join(", ",
                    cap(vocab.signTraits(sunSign, locale).get(0)),
                    lower(vocab.signTraits(moonSign, locale).get(0)));

        String element = chart.emphasis() != null ? chart.emphasis().dominantElement() : null;
        String modality = chart.emphasis() != null ? chart.emphasis().dominantModality() : null;

        StringBuilder summary = new StringBuilder();
        summary.append(en
                ? "Your chart leans toward " + element(element, locale) + ": " + vocab.elementTone(element, locale) + ". "
                : "Haritan ağırlıklı olarak " + element(element, locale) + " tonunda: " + vocab.elementTone(element, locale) + ". ");
        summary.append(en
                ? "With " + modality(modality, locale) + " emphasis, " + vocab.modalityTone(modality, locale) + ". "
                : modality(modality, locale) + " vurgusuyla " + vocab.modalityTone(modality, locale) + ". ");
        if (chart.sun() != null && chart.sun().house() != null) {
            summary.append(en
                    ? "Your core identity plays out most visibly around " + vocab.houseArea(chart.sun().house(), locale) + "."
                    : "Kimliğin en çok " + vocab.houseArea(chart.sun().house(), locale) + " alanında görünür hale geliyor.");
        } else {
            summary.append(en
                    ? "The Sun–Moon pairing is the clearest signal in your chart."
                    : "Güneş–Ay ikilisi haritandaki en net sinyal.");
        }

        List<String> traits = new ArrayList<>(new LinkedHashSet<>(concat(
                vocab.signTraits(sunSign, locale),
                vocab.signTraits(moonSign, locale),
                risingSign != null ? vocab.signTraits(risingSign, locale) : List.of())));

        return new NatalPortrait.Portrait(
                headline,
                summary.toString().strip(),
                traits.stream().limit(6).toList(),
                bigThreeEvidence(chart, locale));
    }

    // ------------------------------------------------------------------ big three

    private NatalPortrait.BigThree buildBigThree(NormalizedNatalChart chart, String locale, boolean en) {
        return new NatalPortrait.BigThree(
                planetEntry(chart, chart.sun(), "Sun",
                        en ? "Who you are at the core" : "Temelde kim olduğun", locale, en),
                planetEntry(chart, chart.moon(), "Moon",
                        en ? "Your emotional world" : "Duygusal dünyan", locale, en),
                ascendantEntry(chart, locale, en));
    }

    private NatalPortrait.BigThreeEntry planetEntry(
            NormalizedNatalChart chart,
            NormalizedNatalChart.NormalizedPlanet planet,
            String planetKey,
            String roleLabel,
            String locale,
            boolean en) {
        if (planet == null) return null;

        String pName = vocab.planetName(planetKey, locale);
        String sName = vocab.signName(planet.sign(), locale);
        String title = en ? "Your " + pName + " in " + sName : pName + "in " + sName + "'ta";

        String meaning = en
                ? cap(vocab.planetDrive(planetKey, locale)) + "."
                : cap(vocab.planetDrive(planetKey, locale)) + ".";

        StringBuilder how = new StringBuilder();
        how.append(en
                ? "You tend to handle this " + vocab.signStyle(planet.sign(), locale) + ". "
                : "Bunu " + vocab.signStyle(planet.sign(), locale) + " ele almaya yatkınsın. ");
        if (planet.house() != null) {
            how.append(en
                    ? "Because it sits in the area of " + vocab.houseArea(planet.house(), locale)
                        + ", that shows up most clearly there."
                    : "Bu yerleşim " + vocab.houseArea(planet.house(), locale)
                        + " alanına düştüğü için kendini en net orada gösteriyor.");
        }
        if (planet.retrograde()) {
            how.append(en
                    ? " It works inward first — you process it privately before it becomes visible."
                    : " Önce içe doğru çalışıyor; görünür hale gelmeden önce onu kendi içinde işliyorsun.");
        }
        if (planet.anaretic()) {
            how.append(en
                    ? " Sitting at the final degree of the sign, this theme carries a sense of urgency."
                    : " Burcun son derecesinde durduğu için bu tema kendini aciliyetle hissettirir.");
        }

        List<String> traits = vocab.signTraits(planet.sign(), locale);
        List<String> strengths = en
                ? List.of(traits.get(0), traits.size() > 1 ? traits.get(1) : traits.get(0))
                : List.of(traits.get(0), traits.size() > 1 ? traits.get(1) : traits.get(0));

        String houseInfluence = planet.house() == null ? null : (en
                ? "In " + vocab.houseName(planet.house(), locale) + " this energy is directed at "
                    + vocab.houseArea(planet.house(), locale) + "."
                : vocab.houseName(planet.house(), locale) + " bu enerjiyi "
                    + vocab.houseArea(planet.house(), locale) + " alanına yönlendiriyor.");

        return new NatalPortrait.BigThreeEntry(
                title,
                roleLabel,
                meaning,
                how.toString().strip(),
                strengths,
                challengeLines(planet.sign(), locale, en),
                houseInfluence,
                connectionLines(chart, planetKey, locale, en),
                List.of(placementEvidence(planet, locale)));
    }

    private NatalPortrait.BigThreeEntry ascendantEntry(NormalizedNatalChart chart, String locale, boolean en) {
        if (chart.ascendant() == null) return null;
        String sign = chart.ascendant().sign();
        String sName = vocab.signName(sign, locale);

        StringBuilder how = new StringBuilder();
        how.append(en
                ? "People meet this side of you first: you come across " + vocab.signStyle(sign, locale) + ". "
                : "İnsanlar önce bu tarafınla karşılaşır: " + vocab.signStyle(sign, locale) + " bir izlenim bırakırsın. ");
        if (chart.chartRuler() != null && chart.chartRuler().house() != null) {
            how.append(en
                    ? "The ruler of your Ascendant, " + vocab.planetName(chart.chartRuler().planet(), locale)
                        + ", sits in the area of " + vocab.houseArea(chart.chartRuler().house(), locale)
                        + " — which is where that first impression actually gets spent."
                    : "Yükselenin yöneticisi " + vocab.planetName(chart.chartRuler().planet(), locale)
                        + ", " + vocab.houseArea(chart.chartRuler().house(), locale)
                        + " alanında duruyor; o ilk izlenim asıl orada harcanıyor.");
        }

        List<NatalPortrait.Evidence> evidence = new ArrayList<>();
        evidence.add(new NatalPortrait.Evidence("PLACEMENT",
                (en ? "Ascendant " : "Yükselen ") + sName, "Ascendant", sign, null, null, null));
        if (chart.chartRuler() != null) {
            evidence.add(new NatalPortrait.Evidence("RULER",
                    vocab.placementLabel(chart.chartRuler().planet(), chart.chartRuler().sign(),
                            chart.chartRuler().house(), locale),
                    chart.chartRuler().planet(), chart.chartRuler().sign(),
                    chart.chartRuler().house(), null, null));
        }

        List<String> traits = vocab.signTraits(sign, locale);
        return new NatalPortrait.BigThreeEntry(
                en ? "Your " + sName + " Rising" : sName + " Yükselen",
                en ? "How people first see you" : "İnsanların seni ilk nasıl gördüğü",
                en ? "The face you put on before anyone knows you." : "Kimse seni tanımadan önce taktığın yüz.",
                how.toString().strip(),
                traits,
                challengeLines(sign, locale, en),
                null,
                chart.chartRuler() != null
                        ? connectionLines(chart, chart.chartRuler().planet(), locale, en)
                        : List.of(),
                evidence);
    }

    // ------------------------------------------------------------------ about me

    private List<NatalPortrait.Topic> buildAboutMe(NormalizedNatalChart chart, String locale, boolean en) {
        List<NatalPortrait.Topic> topics = new ArrayList<>();

        topics.add(topic("core_character",
                en ? "Your core character" : "Temel karakterim",
                en ? "What stays the same about you" : "Sende değişmeyen taraf",
                coreCharacterSummary(chart, locale, en),
                en ? "It shows in how you make decisions when nobody is watching."
                        : "Kimse bakmadığında verdiğin kararlarda kendini gösterir.",
                vocab.signTraits(signOf(chart.sun()), locale),
                challengeLines(signOf(chart.sun()), locale, en),
                bigThreeEvidence(chart, locale)));

        topics.add(topic("emotional_world",
                en ? "Your emotional world" : "Duygusal dünyam",
                en ? "What you need to feel safe" : "Güvende hissetmek için ihtiyacın olan",
                emotionalSummary(chart, locale, en),
                en ? "Under stress this is the first thing that changes about you."
                        : "Stres altında sende ilk değişen şey budur.",
                vocab.signTraits(signOf(chart.moon()), locale),
                challengeLines(signOf(chart.moon()), locale, en),
                chart.moon() != null ? List.of(placementEvidence(chart.moon(), locale)) : List.of()));

        topics.add(topic("social_image",
                en ? "How people see you" : "İnsanlar beni nasıl görüyor?",
                en ? "Your first impression" : "Bıraktığın ilk izlenim",
                socialImageSummary(chart, locale, en),
                en ? "It is what people describe you as before they know you well."
                        : "İnsanların seni iyi tanımadan önce yaptığı tarif budur.",
                chart.ascendant() != null ? vocab.signTraits(chart.ascendant().sign(), locale) : List.of(),
                List.of(),
                ascendantEvidence(chart, locale)));

        topics.add(topic("strengths",
                en ? "Your strengths" : "Güçlü yönlerim",
                en ? "What comes naturally" : "Sana doğal gelen",
                strengthsSummary(chart, locale, en),
                en ? "These are the things you do well without having to try hard."
                        : "Bunlar çok uğraşmadan iyi yaptığın şeyler.",
                dominantTraits(chart, locale),
                List.of(),
                supportiveAspectEvidence(chart, locale)));

        topics.add(topic("challenges",
                en ? "What challenges you" : "Zorlandığım taraflar",
                en ? "Where the friction lives" : "Sürtünmenin yaşadığı yer",
                challengesSummary(chart, locale, en),
                en ? "It usually surfaces when you are tired or under pressure."
                        : "Genelde yorgun ya da baskı altındayken yüzeye çıkar.",
                List.of(),
                tenseAspectLines(chart, locale, en),
                tenseAspectEvidence(chart, locale)));

        topics.add(topic("inner_conflicts",
                en ? "Your inner conflicts" : "İç çatışmalarım",
                en ? "Two parts of you pulling apart" : "Birbirini çeken iki tarafın",
                innerConflictSummary(chart, locale, en),
                en ? "You notice it most when you have to choose quickly."
                        : "Hızlı seçim yapman gerektiğinde en çok fark edersin.",
                List.of(),
                List.of(),
                tenseAspectEvidence(chart, locale)));

        return topics;
    }

    // ------------------------------------------------------------------ life areas

    private List<NatalPortrait.Topic> buildLifeAreas(NormalizedNatalChart chart, String locale, boolean en) {
        List<NatalPortrait.Topic> topics = new ArrayList<>();

        topics.add(lifeTopic(chart, locale, en, "love",
                en ? "Love & relationships" : "Aşk & İlişkiler",
                en ? "How you connect" : "Nasıl bağ kurduğun",
                List.of("Venus", "Moon"), List.of(5, 7)));

        topics.add(lifeTopic(chart, locale, en, "career",
                en ? "Career & work" : "Kariyer & İş Hayatı",
                en ? "How you work best" : "En iyi nasıl çalıştığın",
                List.of("Saturn", "Mars", "Mercury"), List.of(2, 6, 10)));

        topics.add(lifeTopic(chart, locale, en, "money",
                en ? "Money & security" : "Para & Güven",
                en ? "What makes you feel secure" : "Seni güvende hissettiren",
                List.of("Venus", "Saturn"), List.of(2, 8)));

        topics.add(lifeTopic(chart, locale, en, "social",
                en ? "Friendship & social life" : "Arkadaşlık & Sosyal Hayat",
                en ? "How you belong" : "Nasıl ait olduğun",
                List.of("Mercury", "Jupiter"), List.of(3, 11)));

        topics.add(lifeTopic(chart, locale, en, "family",
                en ? "Family & roots" : "Aile & Kökler",
                en ? "Where you come from" : "Nereden geldiğin",
                List.of("Moon", "Saturn"), List.of(4)));

        topics.add(lifeTopic(chart, locale, en, "life_direction",
                en ? "Your life direction" : "Hayat Yönüm",
                en ? "Where you are growing toward" : "Doğru büyüdüğün yön",
                List.of("NorthNode", "Jupiter"), List.of(9, 10)));

        topics.add(lifeTopic(chart, locale, en, "talents",
                en ? "Your natural talents" : "Yeteneklerim",
                en ? "What you were handed for free" : "Sana bedava verilen",
                List.of("Jupiter", "Venus"), List.of(5)));

        return topics;
    }

    /**
     * Assembles one life-area card from the placements that actually govern it.
     *
     * <p>The card leads with the ruling planets' signs and the relevant house cusps, so "career"
     * reads differently for a Capricorn Saturn in the 6th than for an Aquarius Saturn in the 10th
     * — which is the whole point of not shipping a static per-house paragraph.</p>
     */
    private NatalPortrait.Topic lifeTopic(
            NormalizedNatalChart chart, String locale, boolean en,
            String id, String title, String subtitle,
            List<String> planetKeys, List<Integer> houseNumbers) {

        List<NormalizedNatalChart.NormalizedPlanet> relevant = planetKeys.stream()
                .map(k -> findPlanet(chart, k))
                .filter(p -> p != null)
                .toList();

        List<NormalizedNatalChart.NormalizedHouse> relevantHouses = houseNumbers.stream()
                .map(n -> findHouse(chart, n))
                .filter(h -> h != null)
                .toList();

        StringBuilder summary = new StringBuilder();
        if (!relevant.isEmpty()) {
            NormalizedNatalChart.NormalizedPlanet lead = relevant.get(0);
            summary.append(en
                    ? "Here you tend to move " + vocab.signStyle(lead.sign(), locale) + ". "
                    : "Bu alanda " + vocab.signStyle(lead.sign(), locale) + " hareket etmeye yatkınsın. ");
            if (lead.house() != null) {
                summary.append(en
                        ? "That instinct is anchored in " + vocab.houseArea(lead.house(), locale) + ". "
                        : "Bu içgüdü " + vocab.houseArea(lead.house(), locale) + " alanına bağlı. ");
            }
        }
        if (relevant.size() > 1) {
            NormalizedNatalChart.NormalizedPlanet second = relevant.get(1);
            summary.append(en
                    ? "Alongside it, " + vocab.planetName(second.planet(), locale) + " in "
                        + vocab.signName(second.sign(), locale) + " adds a need to handle things "
                        + vocab.signStyle(second.sign(), locale) + ". "
                    : "Yanında " + vocab.planetName(second.planet(), locale) + " "
                        + vocab.signName(second.sign(), locale) + "'ta, işleri "
                        + vocab.signStyle(second.sign(), locale) + " ele alma ihtiyacı ekliyor. ");
        }
        if (!relevantHouses.isEmpty()) {
            NormalizedNatalChart.NormalizedHouse house = relevantHouses.get(0);
            summary.append(en
                    ? "With " + vocab.signName(house.sign(), locale) + " on the "
                        + vocab.houseName(house.houseNumber(), locale) + " cusp, "
                        + vocab.houseArea(house.houseNumber(), locale) + " is approached "
                        + vocab.signStyle(house.sign(), locale) + "."
                    : vocab.houseName(house.houseNumber(), locale) + " başlangıcında "
                        + vocab.signName(house.sign(), locale) + " olduğu için "
                        + vocab.houseArea(house.houseNumber(), locale) + " konusuna "
                        + vocab.signStyle(house.sign(), locale) + " yaklaşıyorsun.");
        }
        if (summary.isEmpty()) {
            summary.append(en
                    ? "Your birth time is needed before this area can be read in detail."
                    : "Bu alanı detaylı okuyabilmek için doğum saatine ihtiyaç var.");
        }

        List<String> strengths = relevant.isEmpty() ? List.of()
                : vocab.signTraits(relevant.get(0).sign(), locale);
        List<String> challenges = relevant.isEmpty() ? List.of()
                : challengeLines(relevant.get(0).sign(), locale, en);

        List<NatalPortrait.Evidence> evidence = new ArrayList<>();
        relevant.forEach(p -> evidence.add(placementEvidence(p, locale)));
        relevantHouses.forEach(h -> evidence.add(new NatalPortrait.Evidence(
                "HOUSE",
                vocab.houseName(h.houseNumber(), locale) + " · " + vocab.signName(h.sign(), locale),
                null, h.sign(), h.houseNumber(), null, null)));

        return topic(id, title, subtitle, summary.toString().strip(),
                en ? "It shows up in the small choices you make in this area every week."
                        : "Bu alanda her hafta verdiğin küçük kararlarda görünür hale gelir.",
                strengths, challenges, evidence);
    }

    // ------------------------------------------------------------------ planet readings

    /**
     * One reading per planet in the chart.
     *
     * <p>Each is composed from that planet's own drive, its sign's style and its house's life
     * area, then fused into a single "how it shows up in you" line. Two planets in the same house
     * therefore produce different text, which is exactly what the previous static per-house
     * sentence could not do.</p>
     */
    private List<NatalPortrait.PlacementReading> buildPlanetReadings(
            NormalizedNatalChart chart, String locale, boolean en) {
        if (chart.planets() == null) return List.of();
        return chart.planets().stream()
                .map(p -> buildPlanetReading(chart, p, locale, en))
                .toList();
    }

    private NatalPortrait.PlacementReading buildPlanetReading(
            NormalizedNatalChart chart,
            NormalizedNatalChart.NormalizedPlanet planet,
            String locale,
            boolean en) {

        String pName = vocab.planetName(planet.planet(), locale);
        String sName = vocab.signName(planet.sign(), locale);
        String drive = vocab.planetDrive(planet.planet(), locale);
        String style = vocab.signStyle(planet.sign(), locale);

        String title = en ? "Your " + pName + " in " + sName : pName + "in " + sName + "'ta";
        String subtitle = cap(drive);

        String whatItMeans = en
                ? pName + " is about " + drive + "."
                : pName + ", " + drive + " ile ilgilidir.";

        String howTheSignShapes = en
                ? sName + " colours that: you tend to handle it " + style + "."
                : sName + " bunu renklendiriyor: bu alanı " + style + " ele almaya yatkınsın.";

        // Weaves this planet's own drive into the house line. Writing a generic per-house sentence
        // here is what made the previous implementation read as templated: three planets in the
        // 6th house all got the same paragraph with the planet name swapped.
        String whereTheHouse = planet.house() == null ? null : (en
                ? "It lands in " + vocab.houseArea(planet.house(), locale)
                    + ", which means " + drive + " is something you work out mainly there."
                : drive + " konusu " + vocab.houseArea(planet.house(), locale)
                    + " alanına düşüyor; yani bunu asıl orada çözüyorsun.");

        // The synthesis line, not a fourth definition: the three parts read as one sentence.
        StringBuilder showsUp = new StringBuilder();
        if (planet.house() != null) {
            showsUp.append(en
                    ? "In practice, " + drive + " gets handled " + style + " — and mostly around "
                        + vocab.houseArea(planet.house(), locale) + "."
                    : "Pratikte " + drive + " konusunu " + style + " ele alıyorsun ve bu en çok "
                        + vocab.houseArea(planet.house(), locale) + " alanında görünüyor.");
        } else {
            showsUp.append(en
                    ? "In practice, " + drive + " gets handled " + style + "."
                    : "Pratikte " + drive + " konusunu " + style + " ele alıyorsun.");
        }
        if (planet.retrograde()) {
            showsUp.append(en
                    ? " Because it is retrograde, this works inward first — you process it privately"
                        + " before anyone sees it."
                    : " Retro olduğu için bu önce içeride çalışıyor; kimse görmeden önce onu kendi"
                        + " içinde işliyorsun.");
        }
        if (planet.anaretic()) {
            showsUp.append(en
                    ? " Sitting at the last degree of the sign, it carries a sense of urgency."
                    : " Burcun son derecesinde durduğu için bir aciliyet duygusu taşıyor.");
        }

        List<NatalPortrait.Evidence> evidence = new ArrayList<>();
        evidence.add(placementEvidence(planet, locale));
        evidence.addAll(aspectEvidenceFor(chart, planet.planet(), locale, 2));

        return new NatalPortrait.PlacementReading(
                planet.planet(),
                title,
                subtitle,
                whatItMeans,
                howTheSignShapes,
                whereTheHouse,
                showsUp.toString().strip(),
                vocab.signTraits(planet.sign(), locale),
                challengeLines(planet.sign(), locale, en),
                connectionLines(chart, planet.planet(), locale, en),
                evidence);
    }

    // ------------------------------------------------------------------ house readings

    /**
     * One reading per house, skipped entirely when the birth time is unknown.
     *
     * <p>Houses without a birth time are not approximate — they are meaningless, so the redesign
     * omits the section rather than showing twelve confident paragraphs built on a guessed
     * ascendant.</p>
     */
    private List<NatalPortrait.HouseReading> buildHouseReadings(
            NormalizedNatalChart chart, String locale, boolean en) {
        if (!chart.birthTimeKnown() || chart.houses() == null) return List.of();
        return chart.houses().stream()
                .map(h -> buildHouseReading(chart, h, locale, en))
                .toList();
    }

    private NatalPortrait.HouseReading buildHouseReading(
            NormalizedNatalChart chart,
            NormalizedNatalChart.NormalizedHouse house,
            String locale,
            boolean en) {

        String area = vocab.houseArea(house.houseNumber(), locale);
        String signName = vocab.signName(house.sign(), locale);
        String signStyle = vocab.signStyle(house.sign(), locale);

        String title = vocab.houseName(house.houseNumber(), locale) + " — " + cap(area);

        String whatItMeans = en
                ? "This part of the chart covers " + area + "."
                : "Haritanın bu bölümü " + area + " ile ilgilidir.";

        String yourSignHere = en
                ? signName + " sits on this cusp, so you approach it " + signStyle + "."
                : "Bu evin başlangıcında " + signName + " var; bu alana " + signStyle + " yaklaşıyorsun.";

        // The ruler's own placement is what carries this house's story into another part of life.
        String rulerStory = house.ruler() == null ? null : (en
                ? "It is ruled by " + vocab.planetName(house.ruler(), locale)
                    + (house.rulerHouse() != null
                        ? ", which sits in " + vocab.houseArea(house.rulerHouse(), locale)
                            + " — so what happens here tends to spill into that area."
                        : ".")
                : "Yöneticisi " + vocab.planetName(house.ruler(), locale)
                    + (house.rulerHouse() != null
                        ? "; o da " + vocab.houseArea(house.rulerHouse(), locale)
                            + " alanında duruyor. Bu yüzden burada olan biten çoğu zaman oraya taşıyor."
                        : "."));

        List<String> residents = house.residentPlanets() == null ? List.of() : house.residentPlanets();
        String residentsStory = residents.isEmpty() ? null : (en
                ? "You have " + joinNames(residents, locale, en) + " placed here, which makes this area louder than most."
                : "Bu evde " + joinNames(residents, locale, en) + " var; bu da bu alanı diğerlerinden daha sesli kılıyor.");

        return new NatalPortrait.HouseReading(
                house.houseNumber(),
                title,
                whatItMeans,
                yourSignHere,
                rulerStory,
                residentsStory,
                buildHouseSynthesis(chart, house, residents, locale, en),
                vocab.signTraits(house.sign(), locale),
                challengeLines(house.sign(), locale, en),
                houseEvidence(chart, house, locale));
    }

    /**
     * Reads the cusp sign against whoever actually lives in the house.
     *
     * <p>When the two disagree — a warm, visible cusp holding a careful, analytical resident —
     * that gap is the most useful thing the chart can say about the person, so it is named
     * explicitly rather than averaged away.</p>
     */
    private String buildHouseSynthesis(
            NormalizedNatalChart chart,
            NormalizedNatalChart.NormalizedHouse house,
            List<String> residents,
            String locale,
            boolean en) {

        String area = vocab.houseArea(house.houseNumber(), locale);
        String cuspStyle = vocab.signStyle(house.sign(), locale);

        if (residents.isEmpty()) {
            return en
                    ? "With nothing placed here, this area runs quietly on its own terms — you meet "
                        + area + " " + cuspStyle + ", without it demanding constant attention."
                    : "Burada yerleşmiş gezegen olmadığı için bu alan kendi sessiz akışında ilerliyor; "
                        + area + " konusuna " + cuspStyle + " yaklaşıyorsun ama bu alan sürekli ilgi istemiyor.";
        }

        NormalizedNatalChart.NormalizedPlanet lead = findPlanet(chart, residents.get(0));
        if (lead == null) {
            return en
                    ? "You meet " + area + " " + cuspStyle + "."
                    : area + " konusuna " + cuspStyle + " yaklaşıyorsun.";
        }

        String residentStyle = vocab.signStyle(lead.sign(), locale);
        String residentDrive = vocab.planetDrive(lead.planet(), locale);

        StringBuilder sb = new StringBuilder();
        sb.append(en
                ? "From the outside you meet " + area + " " + cuspStyle + ". "
                : "Dışarıdan bakıldığında " + area + " konusuna " + cuspStyle + " yaklaşıyorsun. ");
        sb.append(en
                ? "Inside it, " + vocab.planetName(lead.planet(), locale) + " is working on "
                    + residentDrive + " " + residentStyle + "."
                : "İçeride ise " + vocab.planetName(lead.planet(), locale) + ", "
                    + residentDrive + " konusunu " + residentStyle + " işliyor.");

        // Naming the mismatch is the whole value of reading cusp and resident together.
        if (!lead.sign().equalsIgnoreCase(house.sign())) {
            sb.append(en
                    ? " Those two are not the same instinct, so people can read this part of you"
                        + " quite differently from how it feels on the inside."
                    : " Bu ikisi aynı içgüdü değil; bu yüzden insanlar bu tarafını, senin içeriden"
                        + " hissettiğinden oldukça farklı okuyabilir.");
        }
        if (residents.size() > 1) {
            sb.append(en
                    ? " With " + residents.size() + " planets here, this is one of the busiest areas in your chart."
                    : " Burada " + residents.size() + " gezegen olduğu için burası haritanın en yoğun alanlarından biri.");
        }
        return sb.toString().strip();
    }

    /** Aspects touching a planet, rendered as experience rather than as aspect names. */
    private List<String> connectionLines(
            NormalizedNatalChart chart, String planetName, String locale, boolean en) {
        if (chart.aspects() == null || planetName == null) return List.of();
        return chart.aspects().stream()
                .filter(a -> planetName.equalsIgnoreCase(a.planet1())
                        || planetName.equalsIgnoreCase(a.planet2()))
                .sorted(Comparator.comparingDouble(NormalizedNatalChart.NormalizedAspect::orb))
                .limit(3)
                .map(a -> {
                    String other = planetName.equalsIgnoreCase(a.planet1()) ? a.planet2() : a.planet1();
                    return en
                            ? cap(vocab.planetDrive(other, locale)) + " and this "
                                + vocab.aspectTone(a.type(), locale) + "."
                            : cap(vocab.planetDrive(other, locale)) + " ile bu taraf "
                                + vocab.aspectTone(a.type(), locale) + ".";
                })
                .toList();
    }

    private List<NatalPortrait.Evidence> aspectEvidenceFor(
            NormalizedNatalChart chart, String planetName, String locale, int limit) {
        if (chart.aspects() == null) return List.of();
        return chart.aspects().stream()
                .filter(a -> planetName.equalsIgnoreCase(a.planet1())
                        || planetName.equalsIgnoreCase(a.planet2()))
                .sorted(Comparator.comparingDouble(NormalizedNatalChart.NormalizedAspect::orb))
                .limit(limit)
                .map(a -> new NatalPortrait.Evidence("ASPECT",
                        vocab.planetName(a.planet1(), locale) + " " + vocab.aspectSymbol(a.type()) + " "
                                + vocab.planetName(a.planet2(), locale) + " · "
                                + String.format(Locale.ROOT, "%.2f", a.orb()) + "°",
                        a.planet1(), null, null, a.type(), a.planet2()))
                .toList();
    }

    private List<NatalPortrait.Evidence> houseEvidence(
            NormalizedNatalChart chart, NormalizedNatalChart.NormalizedHouse house, String locale) {
        List<NatalPortrait.Evidence> evidence = new ArrayList<>();
        evidence.add(new NatalPortrait.Evidence("HOUSE",
                vocab.houseName(house.houseNumber(), locale) + " · " + vocab.signName(house.sign(), locale),
                null, house.sign(), house.houseNumber(), null, null));

        if (house.ruler() != null && house.rulerSign() != null) {
            evidence.add(new NatalPortrait.Evidence("RULER",
                    vocab.placementLabel(house.ruler(), house.rulerSign(), house.rulerHouse(), locale),
                    house.ruler(), house.rulerSign(), house.rulerHouse(), null, null));
        }

        if (house.residentPlanets() != null) {
            house.residentPlanets().stream()
                    .map(name -> findPlanet(chart, name))
                    .filter(p -> p != null)
                    .limit(3)
                    .forEach(p -> evidence.add(placementEvidence(p, locale)));
        }
        return evidence;
    }

    private String joinNames(List<String> planets, String locale, boolean en) {
        List<String> names = planets.stream().map(p -> vocab.planetName(p, locale)).toList();
        if (names.size() == 1) return names.get(0);
        String head = String.join(", ", names.subList(0, names.size() - 1));
        return head + (en ? " and " : " ve ") + names.get(names.size() - 1);
    }

    // ------------------------------------------------------------------ aspects

    private NatalPortrait.AspectStory buildAspectStory(NormalizedNatalChart chart, String locale, boolean en) {
        List<NormalizedNatalChart.NormalizedAspect> aspects =
                chart.aspects() == null ? List.of() : chart.aspects();

        List<NatalPortrait.AspectTheme> supportive = aspects.stream()
                .filter(a -> "SUPPORTIVE".equals(a.tone()))
                .sorted(Comparator.comparingDouble(NormalizedNatalChart.NormalizedAspect::orb))
                .limit(4)
                .map(a -> aspectTheme(a, locale, en))
                .toList();

        List<NatalPortrait.AspectTheme> tension = aspects.stream()
                .filter(a -> "TENSE".equals(a.tone()))
                .sorted(Comparator.comparingDouble(NormalizedNatalChart.NormalizedAspect::orb))
                .limit(4)
                .map(a -> aspectTheme(a, locale, en))
                .toList();

        return new NatalPortrait.AspectStory(supportive, tension);
    }

    /** Leads with the lived experience; the aspect name and orb stay in the evidence chip. */
    private NatalPortrait.AspectTheme aspectTheme(
            NormalizedNatalChart.NormalizedAspect a, String locale, boolean en) {
        String p1 = vocab.planetName(a.planet1(), locale);
        String p2 = vocab.planetName(a.planet2(), locale);

        String title = en
                ? cap(vocab.planetDrive(a.planet1(), locale)) + " vs. " + vocab.planetDrive(a.planet2(), locale)
                : cap(vocab.planetDrive(a.planet1(), locale)) + " ile " + vocab.planetDrive(a.planet2(), locale)
                    + " arasında";

        String description = en
                ? "The part of you that governs " + vocab.planetDrive(a.planet1(), locale)
                    + " and the part that governs " + vocab.planetDrive(a.planet2(), locale) + " "
                    + vocab.aspectTone(a.type(), locale) + "."
                : vocab.planetDrive(a.planet1(), locale) + " ile ilgili tarafın ve "
                    + vocab.planetDrive(a.planet2(), locale) + " ile ilgili tarafın "
                    + vocab.aspectTone(a.type(), locale) + ".";

        String label = p1 + " " + vocab.aspectSymbol(a.type()) + " " + p2
                + " · " + String.format(Locale.ROOT, "%.2f", a.orb()) + "°";

        return new NatalPortrait.AspectTheme(title, description,
                List.of(new NatalPortrait.Evidence("ASPECT", label,
                        a.planet1(), null, null, a.type(), a.planet2())));
    }

    // ------------------------------------------------------------------ summaries

    private String coreCharacterSummary(NormalizedNatalChart chart, String locale, boolean en) {
        String element = chart.emphasis() != null ? chart.emphasis().dominantElement() : null;
        StringBuilder sb = new StringBuilder();
        if (chart.sun() != null) {
            sb.append(en
                    ? "At the centre of your chart you approach life " + vocab.signStyle(chart.sun().sign(), locale) + ". "
                    : "Haritanın merkezinde hayata " + vocab.signStyle(chart.sun().sign(), locale) + " yaklaşıyorsun. ");
        }
        sb.append(en
                ? "Overall " + vocab.elementTone(element, locale) + "."
                : "Genel olarak " + vocab.elementTone(element, locale) + ".");
        if (chart.emphasis() != null && !chart.emphasis().missingElements().isEmpty()) {
            String missing = chart.emphasis().missingElements().get(0);
            sb.append(en
                    ? " There is little " + element(missing, locale) + " in your chart, so that quality is something you build rather than inherit."
                    : " Haritanda " + element(missing, locale) + " neredeyse hiç yok; bu nedenle o niteliği doğuştan almak yerine sonradan inşa ediyorsun.");
        }
        return sb.toString().strip();
    }

    private String emotionalSummary(NormalizedNatalChart chart, String locale, boolean en) {
        if (chart.moon() == null) {
            return en ? "The Moon's position is needed to read this." : "Bunu okuyabilmek için Ay konumu gerekiyor.";
        }
        StringBuilder sb = new StringBuilder();
        sb.append(en
                ? "You process feelings " + vocab.signStyle(chart.moon().sign(), locale) + ". "
                : "Duygularını " + vocab.signStyle(chart.moon().sign(), locale) + " işliyorsun. ");
        if (chart.moon().house() != null) {
            sb.append(en
                    ? "Because your Moon sits in the area of " + vocab.houseArea(chart.moon().house(), locale)
                        + ", your mood is closely tied to what happens there."
                    : "Ay'ın " + vocab.houseArea(chart.moon().house(), locale)
                        + " alanına düştüğü için ruh halin orada olan bitene sıkı sıkıya bağlı.");
        }
        return sb.toString().strip();
    }

    private String socialImageSummary(NormalizedNatalChart chart, String locale, boolean en) {
        if (chart.ascendant() == null) {
            return en
                    ? "Your exact birth time is needed before the first-impression layer can be read."
                    : "İlk izlenim katmanını okuyabilmek için kesin doğum saatine ihtiyaç var.";
        }
        String sign = chart.ascendant().sign();
        StringBuilder sb = new StringBuilder();
        sb.append(en
                ? "People tend to read you as someone who operates " + vocab.signStyle(sign, locale) + ". "
                : "İnsanlar seni " + vocab.signStyle(sign, locale) + " hareket eden biri olarak okumaya yatkın. ");
        if (chart.sun() != null && !chart.sun().sign().equalsIgnoreCase(sign)) {
            sb.append(en
                    ? "That is not quite the same as your inner setting, so the way you are perceived and the way you feel can differ more than people realise."
                    : "Bu, iç ayarınla tam olarak aynı değil; bu yüzden algılanma biçiminle hissettiğin şey insanların sandığından daha fazla ayrışabilir.");
        }
        return sb.toString().strip();
    }

    private String strengthsSummary(NormalizedNatalChart chart, String locale, boolean en) {
        List<NormalizedNatalChart.NormalizedAspect> supportive = chart.aspects() == null ? List.of()
                : chart.aspects().stream().filter(a -> "SUPPORTIVE".equals(a.tone()))
                    .sorted(Comparator.comparingDouble(NormalizedNatalChart.NormalizedAspect::orb))
                    .limit(2).toList();
        if (supportive.isEmpty()) {
            return en
                    ? "Your chart has few easy aspects, which usually means your strengths were built deliberately rather than handed to you."
                    : "Haritanda kolay açı az; bu genelde güçlü yanlarının sana verilmediğini, senin tarafından bilinçli olarak inşa edildiğini gösterir.";
        }
        StringBuilder sb = new StringBuilder();
        for (NormalizedNatalChart.NormalizedAspect a : supportive) {
            sb.append(en
                    ? cap(vocab.planetDrive(a.planet1(), locale)) + " and "
                        + vocab.planetDrive(a.planet2(), locale) + " " + vocab.aspectTone(a.type(), locale) + ". "
                    : cap(vocab.planetDrive(a.planet1(), locale)) + " ile "
                        + vocab.planetDrive(a.planet2(), locale) + " " + vocab.aspectTone(a.type(), locale) + ". ");
        }
        return sb.toString().strip();
    }

    private String challengesSummary(NormalizedNatalChart chart, String locale, boolean en) {
        List<NormalizedNatalChart.NormalizedAspect> tense = tightestTense(chart, 2);
        if (tense.isEmpty()) {
            return en
                    ? "Your chart carries little hard tension, which can make it harder to notice when you are avoiding something."
                    : "Haritanda sert gerilim az; bu da bir şeyden kaçındığını fark etmeni zorlaştırabilir.";
        }
        StringBuilder sb = new StringBuilder();
        for (NormalizedNatalChart.NormalizedAspect a : tense) {
            sb.append(en
                    ? "Your need for " + vocab.planetDrive(a.planet1(), locale) + " and your need for "
                        + vocab.planetDrive(a.planet2(), locale) + " " + vocab.aspectTone(a.type(), locale) + ". "
                    : vocab.planetDrive(a.planet1(), locale) + " ihtiyacınla "
                        + vocab.planetDrive(a.planet2(), locale) + " ihtiyacın " + vocab.aspectTone(a.type(), locale) + ". ");
        }
        return sb.toString().strip();
    }

    private String innerConflictSummary(NormalizedNatalChart chart, String locale, boolean en) {
        List<NormalizedNatalChart.NormalizedAspect> tense = tightestTense(chart, 1);
        if (tense.isEmpty()) {
            return en
                    ? "No single tight tension dominates your chart; your conflicts tend to be situational rather than structural."
                    : "Haritanda baskın tek bir sıkı gerilim yok; çatışmaların yapısal olmaktan çok duruma bağlı olma eğiliminde.";
        }
        NormalizedNatalChart.NormalizedAspect a = tense.get(0);
        return en
                ? "The clearest split in your chart is between " + vocab.planetDrive(a.planet1(), locale)
                    + " and " + vocab.planetDrive(a.planet2(), locale) + ". These two "
                    + vocab.aspectTone(a.type(), locale)
                    + ", so satisfying one often costs you something on the other side."
                : "Haritandaki en net ayrım " + vocab.planetDrive(a.planet1(), locale) + " ile "
                    + vocab.planetDrive(a.planet2(), locale) + " arasında. Bu ikisi "
                    + vocab.aspectTone(a.type(), locale)
                    + "; bu yüzden birini doyurmak çoğu zaman diğer taraftan bir şey götürüyor.";
    }

    // ------------------------------------------------------------------ helpers

    private List<NormalizedNatalChart.NormalizedAspect> tightestTense(NormalizedNatalChart chart, int limit) {
        if (chart.aspects() == null) return List.of();
        return chart.aspects().stream()
                .filter(a -> "TENSE".equals(a.tone()))
                .sorted(Comparator.comparingDouble(NormalizedNatalChart.NormalizedAspect::orb))
                .limit(limit)
                .toList();
    }

    private List<String> tenseAspectLines(NormalizedNatalChart chart, String locale, boolean en) {
        return tightestTense(chart, 3).stream()
                .map(a -> en
                        ? cap(vocab.planetDrive(a.planet1(), locale)) + " vs. " + vocab.planetDrive(a.planet2(), locale)
                        : cap(vocab.planetDrive(a.planet1(), locale)) + " / " + vocab.planetDrive(a.planet2(), locale))
                .toList();
    }

    private List<NatalPortrait.Evidence> tenseAspectEvidence(NormalizedNatalChart chart, String locale) {
        return tightestTense(chart, 3).stream()
                .map(a -> new NatalPortrait.Evidence("ASPECT",
                        vocab.planetName(a.planet1(), locale) + " " + vocab.aspectSymbol(a.type()) + " "
                                + vocab.planetName(a.planet2(), locale) + " · "
                                + String.format(Locale.ROOT, "%.2f", a.orb()) + "°",
                        a.planet1(), null, null, a.type(), a.planet2()))
                .toList();
    }

    private List<NatalPortrait.Evidence> supportiveAspectEvidence(NormalizedNatalChart chart, String locale) {
        if (chart.aspects() == null) return List.of();
        return chart.aspects().stream()
                .filter(a -> "SUPPORTIVE".equals(a.tone()))
                .sorted(Comparator.comparingDouble(NormalizedNatalChart.NormalizedAspect::orb))
                .limit(3)
                .map(a -> new NatalPortrait.Evidence("ASPECT",
                        vocab.planetName(a.planet1(), locale) + " " + vocab.aspectSymbol(a.type()) + " "
                                + vocab.planetName(a.planet2(), locale) + " · "
                                + String.format(Locale.ROOT, "%.2f", a.orb()) + "°",
                        a.planet1(), null, null, a.type(), a.planet2()))
                .toList();
    }

    private List<NatalPortrait.Evidence> bigThreeEvidence(NormalizedNatalChart chart, String locale) {
        List<NatalPortrait.Evidence> evidence = new ArrayList<>();
        if (chart.sun() != null) evidence.add(placementEvidence(chart.sun(), locale));
        if (chart.moon() != null) evidence.add(placementEvidence(chart.moon(), locale));
        evidence.addAll(ascendantEvidence(chart, locale));
        return evidence;
    }

    private List<NatalPortrait.Evidence> ascendantEvidence(NormalizedNatalChart chart, String locale) {
        if (chart.ascendant() == null) return List.of();
        return List.of(new NatalPortrait.Evidence("PLACEMENT",
                (vocab.isEnglish(locale) ? "Ascendant " : "Yükselen ")
                        + vocab.signName(chart.ascendant().sign(), locale),
                "Ascendant", chart.ascendant().sign(), null, null, null));
    }

    private NatalPortrait.Evidence placementEvidence(
            NormalizedNatalChart.NormalizedPlanet p, String locale) {
        return new NatalPortrait.Evidence("PLACEMENT",
                vocab.placementLabel(p.planet(), p.sign(), p.house(), locale),
                p.planet(), p.sign(), p.house(), null, null);
    }

    private List<String> dominantTraits(NormalizedNatalChart chart, String locale) {
        if (chart.emphasis() == null || chart.emphasis().dominantPlanets() == null) return List.of();
        LinkedHashSet<String> traits = new LinkedHashSet<>();
        for (String planetName : chart.emphasis().dominantPlanets()) {
            NormalizedNatalChart.NormalizedPlanet p = findPlanet(chart, planetName);
            if (p != null) traits.addAll(vocab.signTraits(p.sign(), locale));
        }
        return traits.stream().limit(5).toList();
    }

    private List<String> challengeLines(String sign, String locale, boolean en) {
        return switch (cap(sign == null ? "" : sign.toLowerCase(Locale.ROOT))) {
            case "Aries" -> en ? List.of("Impatience", "Acting before listening") : List.of("Sabırsızlık", "Dinlemeden harekete geçmek");
            case "Taurus" -> en ? List.of("Resisting change", "Holding on too long") : List.of("Değişime direnmek", "Fazla uzun tutunmak");
            case "Gemini" -> en ? List.of("Scattering focus", "Starting more than you finish") : List.of("Odağın dağılması", "Bitirdiğinden fazlasını başlatmak");
            case "Cancer" -> en ? List.of("Taking things personally", "Withdrawing instead of saying it") : List.of("Üstüne alınmak", "Söylemek yerine geri çekilmek");
            case "Leo" -> en ? List.of("Needing recognition", "Taking silence as rejection") : List.of("Takdir ihtiyacı", "Sessizliği ret gibi almak");
            case "Virgo" -> en ? List.of("Over-analysing", "Being hard on yourself") : List.of("Fazla analiz etmek", "Kendine sert davranmak");
            case "Libra" -> en ? List.of("Avoiding conflict", "Deciding late") : List.of("Çatışmadan kaçınmak", "Geç karar vermek");
            case "Scorpio" -> en ? List.of("Struggling to trust", "Keeping too much inside") : List.of("Güvenmekte zorlanmak", "Fazlasını içinde tutmak");
            case "Sagittarius" -> en ? List.of("Overpromising", "Skipping the detail") : List.of("Fazla söz vermek", "Detayı atlamak");
            case "Capricorn" -> en ? List.of("Carrying too much alone", "Delaying rest") : List.of("Fazlasını tek başına taşımak", "Dinlenmeyi ertelemek");
            case "Aquarius" -> en ? List.of("Detaching under pressure", "Resisting closeness") : List.of("Baskı altında mesafelenmek", "Yakınlığa direnmek");
            case "Pisces" -> en ? List.of("Absorbing other people's moods", "Setting boundaries") : List.of("Başkalarının ruh halini üstlenmek", "Sınır koymak");
            default -> List.of();
        };
    }

    private NatalPortrait.Topic topic(String id, String title, String subtitle, String summary,
                                      String dailyLife, List<String> strengths, List<String> challenges,
                                      List<NatalPortrait.Evidence> evidence) {
        return new NatalPortrait.Topic(id, title, subtitle, summary, dailyLife,
                strengths == null ? List.of() : strengths,
                challenges == null ? List.of() : challenges,
                evidence == null ? List.of() : evidence);
    }

    private NormalizedNatalChart.NormalizedPlanet findPlanet(NormalizedNatalChart chart, String name) {
        if (chart.planets() == null || name == null) return null;
        return chart.planets().stream()
                .filter(p -> name.equalsIgnoreCase(p.planet()))
                .findFirst().orElse(null);
    }

    private NormalizedNatalChart.NormalizedHouse findHouse(NormalizedNatalChart chart, int number) {
        if (chart.houses() == null) return null;
        return chart.houses().stream()
                .filter(h -> h.houseNumber() == number)
                .findFirst().orElse(null);
    }

    private String signOf(NormalizedNatalChart.NormalizedPlanet p) {
        return p != null ? p.sign() : null;
    }

    private String element(String element, String locale) {
        boolean en = vocab.isEnglish(locale);
        return switch (element == null ? "" : element) {
            case "Fire" -> en ? "Fire" : "Ateş";
            case "Earth" -> en ? "Earth" : "Toprak";
            case "Air" -> en ? "Air" : "Hava";
            case "Water" -> en ? "Water" : "Su";
            default -> en ? "a mixed balance" : "karma bir denge";
        };
    }

    private String modality(String modality, String locale) {
        boolean en = vocab.isEnglish(locale);
        return switch (modality == null ? "" : modality) {
            case "Cardinal" -> en ? "Cardinal" : "Öncü";
            case "Fixed" -> en ? "Fixed" : "Sabit";
            case "Mutable" -> en ? "Mutable" : "Değişken";
            default -> en ? "a balanced" : "dengeli bir";
        };
    }

    @SafeVarargs
    private List<String> concat(List<String>... lists) {
        List<String> out = new ArrayList<>();
        for (List<String> list : lists) out.addAll(list);
        return out;
    }

    private String join(String sep, String... parts) {
        return String.join(sep, java.util.Arrays.stream(parts)
                .filter(part -> part != null && !part.isBlank())
                .toList());
    }

    private String cap(String value) {
        if (value == null || value.isEmpty()) return "";
        return Character.toUpperCase(value.charAt(0)) + value.substring(1);
    }

    private String lower(String value) {
        if (value == null || value.isEmpty()) return "";
        return Character.toLowerCase(value.charAt(0)) + value.substring(1);
    }
}
