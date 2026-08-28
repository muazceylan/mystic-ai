package com.mysticai.astrology.service.natal;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Localized building blocks for the deterministic interpretation path.
 *
 * <p>These are deliberately <em>fragments</em>, not sentences: a planet's core drive, a sign's
 * flavour, a house's life area. The composer joins them with real chart facts, which is what keeps
 * the offline path from reading like the templated copy this redesign replaced. Nothing here is a
 * complete user-facing paragraph on its own.</p>
 */
@Component
public class NatalVocabulary {

    public boolean isEnglish(String locale) {
        return locale != null && locale.toLowerCase(Locale.ROOT).startsWith("en");
    }

    // ------------------------------------------------------------------ names

    private static final Map<String, String> PLANET_TR = Map.ofEntries(
            Map.entry("Sun", "Güneş"), Map.entry("Moon", "Ay"), Map.entry("Mercury", "Merkür"),
            Map.entry("Venus", "Venüs"), Map.entry("Mars", "Mars"), Map.entry("Jupiter", "Jüpiter"),
            Map.entry("Saturn", "Satürn"), Map.entry("Uranus", "Uranüs"), Map.entry("Neptune", "Neptün"),
            Map.entry("Pluto", "Plüton"), Map.entry("Chiron", "Kiron"), Map.entry("NorthNode", "Kuzey Ay Düğümü"),
            Map.entry("North Node", "Kuzey Ay Düğümü")
    );

    private static final Map<String, String> SIGN_TR = Map.ofEntries(
            Map.entry("Aries", "Koç"), Map.entry("Taurus", "Boğa"), Map.entry("Gemini", "İkizler"),
            Map.entry("Cancer", "Yengeç"), Map.entry("Leo", "Aslan"), Map.entry("Virgo", "Başak"),
            Map.entry("Libra", "Terazi"), Map.entry("Scorpio", "Akrep"), Map.entry("Sagittarius", "Yay"),
            Map.entry("Capricorn", "Oğlak"), Map.entry("Aquarius", "Kova"), Map.entry("Pisces", "Balık")
    );

    public String planetName(String planet, String locale) {
        if (planet == null) return "";
        if (isEnglish(locale)) return planet.replaceAll("([a-z])([A-Z])", "$1 $2");
        return PLANET_TR.getOrDefault(planet, planet);
    }

    public String signName(String sign, String locale) {
        if (sign == null) return "";
        String canonical = capitalize(sign);
        if (isEnglish(locale)) return canonical;
        return SIGN_TR.getOrDefault(canonical, canonical);
    }

    /** "8. Ev" / "8th House" — the only place house numbering gets rendered. */
    public String houseName(Integer house, String locale) {
        if (house == null) return "";
        if (isEnglish(locale)) return house + ordinalSuffix(house) + " House";
        return house + ". Ev";
    }

    /** "Ay Başak · 1. Ev" — the evidence chip label format used across every card. */
    public String placementLabel(String planet, String sign, Integer house, String locale) {
        StringBuilder sb = new StringBuilder();
        sb.append(planetName(planet, locale));
        if (sign != null) sb.append(' ').append(signName(sign, locale));
        if (house != null) sb.append(" · ").append(houseName(house, locale));
        return sb.toString();
    }

    // ------------------------------------------------------------------ meaning fragments

    /** What a planet fundamentally wants — the "GEZEGEN = NE?" half of the teaching model. */
    public String planetDrive(String planet, String locale) {
        boolean en = isEnglish(locale);
        return switch (planet == null ? "" : planet) {
            case "Sun" -> en ? "who you are at the core and what you want to be seen for"
                    : "temelde kim olduğun ve neyle görünmek istediğin";
            case "Moon" -> en ? "what you need in order to feel safe"
                    : "kendini güvende hissetmek için neye ihtiyaç duyduğun";
            case "Mercury" -> en ? "how you think, learn and put things into words"
                    : "nasıl düşündüğün, öğrendiğin ve kelimelere döktüğün";
            case "Venus" -> en ? "what you find valuable and how you show affection"
                    : "neyi değerli bulduğun ve sevgiyi nasıl gösterdiğin";
            case "Mars" -> en ? "how you act, push and defend your ground"
                    : "nasıl harekete geçtiğin ve kendini nasıl savunduğun";
            case "Jupiter" -> en ? "where you grow, take risks and look for meaning"
                    : "nerede büyüdüğün, risk aldığın ve anlam aradığın";
            case "Saturn" -> en ? "where you take things seriously and build slowly"
                    : "nerede ciddileştiğin ve yavaş yavaş inşa ettiğin";
            case "Uranus" -> en ? "where you break the pattern and need freedom"
                    : "kalıbı nerede kırdığın ve özgürlüğe ihtiyaç duyduğun";
            case "Neptune" -> en ? "where the boundaries blur and imagination takes over"
                    : "sınırların bulanıklaştığı ve hayal gücünün devreye girdiği alan";
            case "Pluto" -> en ? "where things end, deepen and start again"
                    : "biten, derinleşen ve yeniden başlayan tarafın";
            case "Chiron" -> en ? "the sore spot you eventually learn to help others with"
                    : "zamanla başkalarına yardım etmeyi öğrendiğin hassas nokta";
            case "NorthNode", "North Node" -> en ? "the direction you are growing toward, even when it feels unfamiliar"
                    : "sana yabancı gelse de doğru büyüdüğün yön";
            default -> en ? "a distinct part of how you operate" : "işleyişinin ayrı bir parçası";
        };
    }

    /** How a sign colours whatever planet sits in it — the "BURÇ = NASIL?" half. */
    public String signStyle(String sign, String locale) {
        boolean en = isEnglish(locale);
        return switch (capitalize(sign)) {
            case "Aries" -> en ? "directly and quickly, before overthinking sets in"
                    : "doğrudan ve hızlı biçimde, fazla düşünmeye fırsat kalmadan";
            case "Taurus" -> en ? "slowly and steadily, needing something solid to hold on to"
                    : "yavaş ve istikrarlı biçimde, tutunacak somut bir şeye ihtiyaç duyarak";
            case "Gemini" -> en ? "through curiosity, words and keeping several options open"
                    : "merak, kelimeler ve birkaç seçeneği açık tutma yoluyla";
            case "Cancer" -> en ? "protectively, through closeness and memory"
                    : "koruyucu biçimde, yakınlık ve hafıza üzerinden";
            case "Leo" -> en ? "warmly and visibly, wanting the effort to be recognised"
                    : "sıcak ve görünür biçimde, emeğin fark edilmesini isteyerek";
            case "Virgo" -> en ? "by analysing, refining and noticing the small things"
                    : "analiz ederek, düzelterek ve küçük detayları fark ederek";
            case "Libra" -> en ? "by weighing both sides and keeping the peace"
                    : "iki tarafı da tartarak ve dengeyi koruyarak";
            case "Scorpio" -> en ? "intensely and privately, all in or not at all"
                    : "yoğun ve içe kapalı biçimde; ya tamamen ya da hiç";
            case "Sagittarius" -> en ? "expansively, looking for the bigger meaning"
                    : "geniş bir açıyla, daha büyük anlamı arayarak";
            case "Capricorn" -> en ? "responsibly and strategically, with the long game in mind"
                    : "sorumlu ve stratejik biçimde, uzun vadeyi düşünerek";
            case "Aquarius" -> en ? "independently and unconventionally, on your own terms"
                    : "bağımsız ve alışılmadık biçimde, kendi şartlarınla";
            case "Pisces" -> en ? "intuitively and permeably, absorbing the atmosphere around you"
                    : "sezgisel ve geçirgen biçimde, etrafındaki atmosferi içine alarak";
            default -> en ? "in your own particular way" : "kendine özgü bir biçimde";
        };
    }

    /** The life area a house governs — the "EV = HANGİ HAYAT ALANINDA?" half. */
    public String houseArea(Integer house, String locale) {
        boolean en = isEnglish(locale);
        if (house == null) return en ? "your inner world" : "iç dünyanda";
        return switch (house) {
            case 1 -> en ? "how you show up and are first perceived" : "kendini nasıl ortaya koyduğun ve ilk nasıl algılandığın";
            case 2 -> en ? "money, self-worth and what makes you feel secure" : "para, kendine biçtiğin değer ve seni güvende hissettiren şeyler";
            case 3 -> en ? "everyday communication, learning and close surroundings" : "günlük iletişim, öğrenme ve yakın çevren";
            case 4 -> en ? "home, family and where you retreat to" : "ev, aile ve geri çekildiğin yer";
            case 5 -> en ? "creativity, play, romance and self-expression" : "yaratıcılık, oyun, flört ve kendini ifade etme";
            case 6 -> en ? "daily routine, work habits and health" : "günlük rutin, iş alışkanlıkları ve sağlık";
            case 7 -> en ? "one-to-one relationships and partnership" : "birebir ilişkiler ve ortaklık";
            case 8 -> en ? "trust, intimacy, shared resources and what stays hidden" : "güven, yakınlık, paylaşılan kaynaklar ve saklı kalan taraflar";
            case 9 -> en ? "belief, travel, study and the bigger picture" : "inanç, seyahat, eğitim ve büyük resim";
            case 10 -> en ? "career, reputation and what you are known for" : "kariyer, itibar ve neyle tanındığın";
            case 11 -> en ? "friendship, community and long-range hopes" : "arkadaşlık, topluluk ve uzun vadeli umutların";
            case 12 -> en ? "solitude, rest and the part of you that stays private" : "yalnızlık, dinlenme ve kendine sakladığın taraf";
            default -> en ? "your inner world" : "iç dünyan";
        };
    }

    /** Short adjectives used as chart-derived trait chips. */
    public List<String> signTraits(String sign, String locale) {
        boolean en = isEnglish(locale);
        return switch (capitalize(sign)) {
            case "Aries" -> en ? List.of("Direct", "Brave") : List.of("Doğrudan", "Cesur");
            case "Taurus" -> en ? List.of("Steady", "Grounded") : List.of("İstikrarlı", "Sağlam");
            case "Gemini" -> en ? List.of("Curious", "Quick") : List.of("Meraklı", "Hızlı");
            case "Cancer" -> en ? List.of("Protective", "Sensitive") : List.of("Koruyucu", "Duyarlı");
            case "Leo" -> en ? List.of("Warm", "Expressive") : List.of("Sıcak", "İfadeli");
            case "Virgo" -> en ? List.of("Analytical", "Precise") : List.of("Analitik", "Titiz");
            case "Libra" -> en ? List.of("Balanced", "Diplomatic") : List.of("Dengeli", "Diplomatik");
            case "Scorpio" -> en ? List.of("Deep", "Perceptive") : List.of("Derin", "Sezgisel");
            case "Sagittarius" -> en ? List.of("Open", "Seeking") : List.of("Açık", "Arayışçı");
            case "Capricorn" -> en ? List.of("Disciplined", "Strategic") : List.of("Disiplinli", "Stratejik");
            case "Aquarius" -> en ? List.of("Independent", "Original") : List.of("Bağımsız", "Özgün");
            case "Pisces" -> en ? List.of("Intuitive", "Imaginative") : List.of("Sezgisel", "Hayalperest");
            default -> en ? List.of("Distinct") : List.of("Kendine özgü");
        };
    }

    public String elementTone(String element, String locale) {
        boolean en = isEnglish(locale);
        return switch (element == null ? "" : element) {
            case "Fire" -> en ? "you move first and think about it afterwards"
                    : "önce harekete geçip sonra düşünmeye yatkınsın";
            case "Earth" -> en ? "you trust what you can actually see, touch and rely on"
                    : "gerçekten görebildiğin, dokunabildiğin ve güvenebildiğin şeye inanırsın";
            case "Air" -> en ? "you process life by thinking it through and talking it out"
                    : "hayatı düşünerek ve konuşarak işlersin";
            case "Water" -> en ? "you read the emotional temperature of a room before anything else"
                    : "bir ortamın duygusal sıcaklığını her şeyden önce okursun";
            default -> en ? "you have a mixed, adaptable way of operating"
                    : "karma ve uyum sağlayan bir işleyişin var";
        };
    }

    public String modalityTone(String modality, String locale) {
        boolean en = isEnglish(locale);
        return switch (modality == null ? "" : modality) {
            case "Cardinal" -> en ? "starting things comes more naturally than finishing them"
                    : "başlatmak, bitirmekten daha doğal gelir";
            case "Fixed" -> en ? "once you commit you are hard to move"
                    : "bir kez karar verdiğinde yerinden oynatılman zordur";
            case "Mutable" -> en ? "you adapt quickly, sometimes before deciding you wanted to"
                    : "hızlı uyum sağlarsın, bazen istediğine karar vermeden önce";
            default -> en ? "you balance initiating, holding and adapting"
                    : "başlatmak, sürdürmek ve uyum sağlamak arasında denge kurarsın";
        };
    }

    /** Human framing for an aspect, used when no AI text is available. */
    public String aspectTone(String type, String locale) {
        boolean en = isEnglish(locale);
        return switch (type == null ? "" : type) {
            case "TRINE" -> en ? "flows together almost without effort"
                    : "neredeyse çabasızca birlikte akıyor";
            case "SEXTILE" -> en ? "works well together when you actively use it"
                    : "aktif olarak kullandığında iyi çalışıyor";
            case "SQUARE" -> en ? "pulls against each other and pushes you to grow"
                    : "birbirini zorluyor ve seni büyümeye itiyor";
            case "OPPOSITION" -> en ? "sits at opposite ends and asks you to find the middle"
                    : "iki uçta duruyor ve senden ortayı bulmanı istiyor";
            case "QUINCUNX" -> en ? "never quite fits together and needs constant adjusting"
                    : "tam olarak birbirine oturmuyor ve sürekli ayar gerektiriyor";
            default -> en ? "fuses into a single, concentrated drive"
                    : "tek ve yoğun bir dürtüde birleşiyor";
        };
    }

    public String aspectSymbol(String type) {
        return switch (type == null ? "" : type) {
            case "TRINE" -> "△";
            case "SEXTILE" -> "⚹";
            case "SQUARE" -> "□";
            case "OPPOSITION" -> "☍";
            case "QUINCUNX" -> "⚻";
            default -> "☌";
        };
    }

    private String capitalize(String value) {
        if (value == null || value.isEmpty()) return "";
        String lower = value.toLowerCase(Locale.ROOT);
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    private String ordinalSuffix(int n) {
        if (n >= 11 && n <= 13) return "th";
        return switch (n % 10) {
            case 1 -> "st";
            case 2 -> "nd";
            case 3 -> "rd";
            default -> "th";
        };
    }
}
