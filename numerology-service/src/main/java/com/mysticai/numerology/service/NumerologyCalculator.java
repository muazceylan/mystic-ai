package com.mysticai.numerology.service;

import com.mysticai.numerology.dto.NumerologyResponse;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.Map;

@Service
public class NumerologyCalculator {

    // Pythagorean numerology chart
    private static final Map<Character, Integer> PYTHAGOREAN_CHART = new HashMap<>();

    static {
        // A=1, B=2, C=3, D=4, E=5, F=6, G=7, H=8, I=9
        // J=1, K=2, L=3, M=4, N=5, O=6, P=7, Q=8, R=9
        // S=1, T=2, U=3, V=4, W=5, X=6, Y=7, Z=8
        String[] letters = {
            "ABCDEFGHI",
            "JKLMNOPQR",
            "STUVWXYZ"
        };
        for (int row = 0; row < letters.length; row++) {
            String rowLetters = letters[row];
            for (int col = 0; col < rowLetters.length(); col++) {
                char letter = rowLetters.charAt(col);
                PYTHAGOREAN_CHART.put(letter, col + 1);
            }
        }
    }

    public NumerologyResponse calculate(String name, String birthDateStr) {
        // Parse and validate birth date
        LocalDate birthDate = parseBirthDate(birthDateStr);
        
        // Calculate numbers
        int lifePathNumber = calculateLifePathNumber(birthDate);
        int destinyNumber = calculateDestinyNumber(name);
        int soulUrgeNumber = calculateSoulUrgeNumber(name);
        
        // Generate summary
        String summary = generateSummary(lifePathNumber, destinyNumber, soulUrgeNumber);
        
        return new NumerologyResponse(
                name,
                birthDateStr,
                lifePathNumber,
                destinyNumber,
                soulUrgeNumber,
                summary
        );
    }

    private LocalDate parseBirthDate(String birthDateStr) {
        try {
            return LocalDate.parse(birthDateStr, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Invalid birth date format. Please use YYYY-MM-DD format.");
        }
    }

    /**
     * Calculates the Life Path Number from birth date.
     * This is the most important number in numerology.
     */
    private int calculateLifePathNumber(LocalDate birthDate) {
        String dateStr = String.format("%04d%02d%02d", 
                birthDate.getYear(), 
                birthDate.getMonthValue(), 
                birthDate.getDayOfMonth());
        return reduceToSingleDigit(sumDigits(dateStr));
    }

    /**
     * Calculates the Destiny Number (Expression Number) from name.
     * This reveals your life's purpose and talents.
     */
    private int calculateDestinyNumber(String name) {
        String cleanName = name.replaceAll("[^A-Za-z]", "").toUpperCase();
        int sum = 0;
        for (char c : cleanName.toCharArray()) {
            Integer value = PYTHAGOREAN_CHART.get(c);
            if (value != null) {
                sum += value;
            }
        }
        return reduceToSingleDigit(sum);
    }

    /**
     * Calculates the Soul Urge Number (Heart's Desire) from vowels in name.
     * This reveals your inner desires and motivations.
     */
    private int calculateSoulUrgeNumber(String name) {
        String cleanName = name.replaceAll("[^A-Za-z]", "").toUpperCase();
        int sum = 0;
        for (char c : cleanName.toCharArray()) {
            if (isVowel(c)) {
                Integer value = PYTHAGOREAN_CHART.get(c);
                if (value != null) {
                    sum += value;
                }
            }
        }
        return reduceToSingleDigit(sum);
    }

    private boolean isVowel(char c) {
        return c == 'A' || c == 'E' || c == 'I' || c == 'O' || c == 'U';
    }

    private int sumDigits(String str) {
        int sum = 0;
        for (char c : str.toCharArray()) {
            if (Character.isDigit(c)) {
                sum += Character.getNumericValue(c);
            }
        }
        return sum;
    }

    /**
     * Reduces a number to a single digit (1-9), except for master numbers 11, 22, 33.
     */
    private int reduceToSingleDigit(int number) {
        // Master numbers in numerology
        if (number == 11 || number == 22 || number == 33) {
            return number;
        }
        
        while (number > 9) {
            int sum = 0;
            while (number > 0) {
                sum += number % 10;
                number /= 10;
            }
            number = sum;
            
            // Check for master numbers during reduction
            if (number == 11 || number == 22 || number == 33) {
                break;
            }
        }
        return number;
    }

    private String generateSummary(int lifePath, int destiny, int soulUrge) {
        return "YASAM YOLU SAYISI: " + lifePath + "\n" +
               getLifePathDescription(lifePath) + "\n\n" +
               "KADER SAYISI: " + destiny + "\n" +
               getDestinyDescription(destiny) + "\n\n" +
               "RUH ARZU SAYISI: " + soulUrge + "\n" +
               getSoulUrgeDescription(soulUrge);
    }

    private String getLifePathDescription(int number) {
        return switch (number) {
            case 1 -> "Liderlik ve bagimsizlik enerjisiyle donanmissin. Hayatin boyunca kendi yolunu cizmek, ilk adimi atmak ve baskalarina ilham olmak senin dogal cagrin. Bugun bu gucu one cikar; baskasini bekleme.";
            case 2 -> "Isbirligi ve sezgi senin en guclu silahindur. Arabuluculuk, iliski kurma ve dengeyi koruma konusundaki dogal yetegenin bugun buyuk kapilar acabilir. Ortaklik tekliflerine acik ol.";
            case 3 -> "Yaraticilik ve ifade senin ozundedir. Sanat, iletisim ve sosyal baglantilar araciligiyla dunyaya isik tutmak senin kaderindedir. Bugun sesini duyur, hayal gucune alan tan.";
            case 4 -> "Disiplin ve guvenilirlik temel taslarindir. Saglamtemeller insa etmek ve uzun vadeli planlar yapmak konusunda dogal bir yetenegine sahipsin. Bugun plana sadik kal ve adim adim ilerle.";
            case 5 -> "Ozgurluk ve degisim senin nefes alanindadir. Macera, yenilik ve deneyim arayisin seni daima ileriye tasir. Bugun esnek kal, yeni kapilara ve beklenmedik firsatlara acik ol.";
            case 6 -> "Hizmet ve sevgi senin en guclu alanindadir. Aile, topluluk ve sifa konusundaki dogal bagliligin bugun cevrenizi derinden etkiler. Ilgiyi kendinle, sonra baskalariyla paylasilani dengele.";
            case 7 -> "Bilgelik ve icsel arayis senin yolundur. Derin analiz, sezgi ve manevi arastirma alanlarinda ustun bir guce sahipsin. Bugun icerine don; cevaplar disarida degil, sende gizli.";
            case 8 -> "Guc ve maddi ustalik senin enerjindir. Is dunyasi, liderlik ve buyuk olcekli basarilar icin dogmuşsun. Bugun hedeflerine odaklan, kararli adimlar at; sonuclara hazir ol.";
            case 9 -> "Evrensel sevgi ve tamamlanma senin yolunun hem sonu hem baslangiçtir. Insanliga hizmet, empati ve buyuk resmi gorme konusundaki dogal yetegenin bugun baskalarina dokunmani sagliyor.";
            case 11 -> "Üstat sayin 11 — Sezgi ve ruhsal aydinlanma icin geldin. Yuksek titresimli enerjiyle insanlari ilham etmek ve kopruler kurmak senin misyonun. Sezgilerine guvenmek bugun cok kritik.";
            case 22 -> "Üstat sayin 22 — Buyuk Usta olarak fiziksel dunyada kalici yapilar insa etmek icin dogdun. Vizyonun ve pratik gucun bulustigunda sinir tanimaz, devasa hedefler gercege donusur.";
            case 33 -> "Üstat sayin 33 — Sifa ve ogretme enerjisiyle yuklusun. Kosulsuz sevgi ve bilgelikle insanliga rehberlik etmek senin en yuce cagrin. Bugun birine yol gosterme firsati dogabilir.";
            default -> "Sayilarinin enerjisi bugun seninle, akisina guven.";
        };
    }

    private String getDestinyDescription(int number) {
        return switch (number) {
            case 1 -> "İsmin hayata oncu ve cesaretle adim atma enerjisi tasiyor. Liderlik rollerine dogal bir yonelim ve ozgun olmak icin guc veriyor; kendi rotandan sapma.";
            case 2 -> "İsmin denge, uyum ve diplomatik zeka enerjisi tasiyor. İnsanlari bir araya getirme ve kopruler kurma konusunda gizli bir guce sahipsin; bunu gunluk hayatinda kullan.";
            case 3 -> "İsmin kelimelerle, sanatla ve neseyle bulusuyor. İfade etme, eglendirme ve ilham verme konusunda dogal bir miknatisin; bu yetenegini paylasmayı ihmal etme.";
            case 4 -> "İsmin seni guvenilir, sabırli ve pratik zemin uzerinde tutuyor. Duzeni koruma ve uzun vadeli cozumler uretme konusunda isminle gelen bir kader var; bunu avantaja cevir.";
            case 5 -> "İsmin ozgurluk, degisim ve macera enerjisi tasiyor. Yasam seni tekrara degil, cesitlilege cagiriyor; rutinden kacan anlarda en buyuk firsatlarini bulacaksin.";
            case 6 -> "İsmin seni aile, topluluk ve hizmete yakin tutuyor. Sevgi dolu bir enerji tasıyan ismin, insanlara bakim gostermeni ve onları iyilestirmeni kolaylastiriyor.";
            case 7 -> "İsmin gizemi ve icsel bilgeligi aciyor. Soru sormak, arastirmak ve derin anlayislar gelistirmek senin dogal yolun; yuzeyde kalmak seni tatmin etmez.";
            case 8 -> "İsmin basari, otorite ve materyal ustalik enerjisi tasiyor. Finansal ve profesyonel alanlarda buyumek senin kaderindedir; bu gucu sorumlulukla kullan.";
            case 9 -> "İsmin evrensel bir enerjiyle yankılaniyor. Tamamlama, birakma ve buyuk tabloya bakma konusundaki dogal yetegenin, senin icinde calisan guclu bir sirdir.";
            case 11 -> "İsmin yuksek vibrasyonlu sezgisel enerji tasiyor. Aydinlatici biri olarak cevrendekilerin bilinc duzeyini yukseltme potansiyeline sahipsin.";
            case 22 -> "İsmin somut basarilari insa etme gucu tasiyor. Hayaller ile eylem arasindaki kopruyu kurma yetenegim sende var; kullan.";
            case 33 -> "İsmin sifa ve ogretme titresimini tasiyor. Cevrendeki insanlara ilham olmak ve onlari iyilestirmek senin en derin cagrindir.";
            default -> "İsmin tasidigi enerji, seni bugun dogru yonde tutuyor.";
        };
    }

    private String getSoulUrgeDescription(int number) {
        return switch (number) {
            case 1 -> "İcinde bagimsiz olmak, kendi kararlarini vermek ve lider konumunda olmak icin guclu bir arzu var. Baskalarina bagimli hissettigende icin daraliyor; ozerkligin senin yakitindir.";
            case 2 -> "Ruhun derin bir baglantıyı, anlasılmayı ve uyumu arzuluyor. Yalniz kalmak seni tuketur; sevdiklerinle paylasilan anlar icin enerji birik.";
            case 3 -> "İcinde ifade etme, yaratma ve paylasma arzusu gizli. Duygu ve dusuncelerini dis dunyaya aktaramadiginda icin sıkilisiyor; yaraticilıga alan ac.";
            case 4 -> "Ruhun guvenlik, duzen ve saglamlik arzuluyor. Belirsizlik seni rahatsiz eder; planlar ve rutinler icini dinginlestirir.";
            case 5 -> "İcinde ozgur olmak, kefsetmek ve degisimi yasamak icin ates var. Monotonluk seni soldurur; yeni deneyimler ruhunu besler.";
            case 6 -> "Ruhun sevilmeyi, ait olmayı ve bakim gostermeyi derin bicimlerde arzuluyor. Sevdiklerinle uyum icinde olmak sana en derin tatmini verir.";
            case 7 -> "İcinde anlami bulmak, gizemleri cozmek ve yalniz dusunme alani icin guclu bir ihtiyac var. Gurultu seni tuketur; sessizlik seni besler.";
            case 8 -> "Ruhun taninmayı, gucu ve materyal refahi derinden arzuluyor. Basari senin icin bir hedef degil, bir ihtiyac; bu enerjiyi saglikli kanallara yonelt.";
            case 9 -> "İcinde insanliga katki saglamak ve anlam yaratan bir sey birakmak icin derin bir arzu var. Kucuk kalmak seni bogar; buyuk dusunmek seni ozgur kirlar.";
            case 11 -> "Ruhun yuksek sezgisel ve manevi gerceklikleri arzuluyor. Icgudulerine guvendigin anlarda derin bir ic huzura ulasiyorsun.";
            case 22 -> "İcinde genis capli, kalici bir etki birakmak icin guclu bir arzu var. Kucuk olcekli calismalar seni tatmin etmez; buyuk vizyonlar seni atesler.";
            case 33 -> "Ruhun kosulsuz sevgi sunmak ve iyilestirmek icin derin bir cagri duyuyor. İnsanlara hizmet etmek sana icsel bir huzur ve anlam veriyor.";
            default -> "Ruhunun icsel arzusu bugun seni dogru yonde yonlendiriyor.";
        };
    }
}
