package com.mysticai.orchestrator.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;

/**
 * Fallback service providing pre-written Turkish mystical interpretations
 * when the AI API is unavailable.
 */
@Service
public class MockInterpretationService {

    private static final Logger logger = LoggerFactory.getLogger(MockInterpretationService.class);
    private static final Random random = new Random();

    private static final Map<String, String> ZODIAC_INTERPRETATIONS = Map.ofEntries(
            Map.entry("KOÇ", """
                    Koç burcunun ateşli enerjisi ruhunuzda parlıyor. Mars'ın savaşçı gücüyle doğan siz, \
                    hayata cesaretle atılan, öncü ruhlu bir varlıksınız. Doğum haritanızdaki bu güçlü \
                    yerleşim, liderlik kapasitesini ve bağımsızlık arzusunu derinlemesine yansıtıyor. \
                    Ateş elementinin size bahşettiği tutku ve kararlılık, önünüzdeki engelleri aşmanız \
                    için gereken tüm enerjiyi sağlıyor. Kozmik haritanız, cesur adımlar atmanız \
                    gerektiğini fısıldıyor. Yeni başlangıçlar için evrenin kapıları sizin için açık."""),
            Map.entry("BOĞA", """
                    Venüs'ün zarif dokunuşuyla şekillenen Boğa enerjisi, ruhunuzun derinliklerinde \
                    sakinlik ve güzellik arayışını yansıtıyor. Toprak elementinin sağlam temelleri \
                    üzerinde yükselen karakteriniz, sabır ve kararlılıkla örülmüş. Doğum haritanız, \
                    maddi dünyada güvenlik ararken ruhsal zenginliği de ihmal etmemeniz gerektiğini \
                    gösteriyor. Venüs'ün rehberliğinde, hayatın güzel yanlarını keşfetmeye devam edin. \
                    Doğanın ritmiyle uyum içinde yaşadığınızda, bolluk kapılarının aralandığını göreceksiniz."""),
            Map.entry("İKİZLER", """
                    Merkür'ün çevik zekasıyla doğan İkizler enerjisi, meraklı ve çok yönlü ruhunuzu \
                    aydınlatıyor. Hava elementinin hafifliğiyle düşünceden düşünceye uçan zihniniz, \
                    bilgiye olan açlığınızı asla doyuramaz. Doğum haritanız, iletişim yeteneklerinizin \
                    evrensel bir hediye olduğunu gösteriyor. Kelimeleriniz köprüler kurar, fikirleriniz \
                    ufuklar açar. Bu dönemde iç sesinizi dinlemeye daha çok zaman ayırın; evren size \
                    önemli mesajlar gönderiyor."""),
            Map.entry("YENGEÇ", """
                    Ay'ın nazik ışığıyla yıkanan Yengeç enerjisi, duygusal derinliğinizi ve koruyucu \
                    doğanızı yansıtıyor. Su elementinin akışkan gücüyle, sezgileriniz pusulası olur \
                    hayatınızın. Doğum haritanız, aile ve yuva kavramlarının ruhunuz için kutsal \
                    olduğunu gösteriyor. Ay'ın evrelerini takip edin; her dolunay size yeni bir farkındalık, \
                    her yeni ay taze bir başlangıç sunuyor. Kalbinizin bilgeliğine güvenin, \
                    çünkü sezgileriniz yıldızlardan bile parlak."""),
            Map.entry("ASLAN", """
                    Güneş'in görkemli ışığıyla taçlanan Aslan enerjisi, yaratıcı gücünüzü ve doğal \
                    karizmayı yansıtıyor. Ateş elementinin en parlak ifadesi olan siz, sahneye çıktığınızda \
                    tüm gözler üzerinizde. Doğum haritanız, liderlik ve yaratıcılığın iç içe geçtiği \
                    benzersiz bir harita sunuyor. Güneş'in altın ışınları, cesurca parlamanız için size \
                    güç veriyor. Kalbinizin sesini takip edin; evren, ışığınızı saklamanızı değil, \
                    dünyayı aydınlatmanızı istiyor."""),
            Map.entry("BAŞAK", """
                    Merkür'ün analitik zekasıyla doğan Başak enerjisi, mükemmeliyetçi ve hizmet odaklı \
                    ruhunuzu aydınlatıyor. Toprak elementinin pratik bilgeliğiyle, detaylarda saklı \
                    güzelliği fark eden nadir ruhlardan birisiniz. Doğum haritanız, iyileştirme ve \
                    düzene getirme yeteneklerinizin kozmik bir görev olduğunu gösteriyor. \
                    Kendinize karşı daha yumuşak olun; mükemmellik aramak güzel ama \
                    kusursuzluk bir illüzyondur. Ruhunuzun bilgeliğine güvenin."""),
            Map.entry("TERAZİ", """
                    Venüs'ün uyum arayan enerjisiyle doğan Terazi, denge ve adalet arayışınızı \
                    yansıtıyor. Hava elementinin zarif dokunuşuyla, ilişkilerde ve sanatta derin bir \
                    estetik anlayışa sahipsiniz. Doğum haritanız, diplomasi ve güzellik yaratma \
                    yeteneklerinizin ruhsal misyonunuzun parçası olduğunu gösteriyor. \
                    İç dengenizi bulmak, dış dengeyi yaratmanın anahtarıdır. \
                    Kendi ihtiyaçlarınızı da başkalarınınki kadar önemseyin."""),
            Map.entry("AKREP", """
                    Plüton'un dönüştürücü gücüyle doğan Akrep enerjisi, ruhunuzun derinliklerindeki \
                    tutkuyu ve yeniden doğuş kapasitesini yansıtıyor. Su elementinin en gizemli ifadesi \
                    olan siz, yüzeyin altındaki gerçekleri görebilen nadir ruhlardansınız. \
                    Doğum haritanız, dönüşüm ve iyileşme yolculuğunuzun kozmik bir plan olduğunu \
                    gösteriyor. Karanlıktan korkmayın; en güzel inciler en derin sularda bulunur. \
                    Her son yeni bir başlangıcın tohumudur."""),
            Map.entry("YAY", """
                    Jüpiter'in genişleten enerjisiyle doğan Yay, özgürlük aşkınızı ve bilgelik \
                    arayışınızı yansıtıyor. Ateş elementinin en felsefi ifadesi olan siz, \
                    ufukların ötesini merak eden bir kaşifsiniz. Doğum haritanız, seyahat ve \
                    öğrenmenin ruhunuzun oksijeni olduğunu gösteriyor. Jüpiter'in bereketli \
                    enerjisi, hayatınıza bolluk ve şans getiriyor. Ok'unuzu yıldızlara nişanlayın; \
                    evren, büyük düşünenleri ödüllendirir."""),
            Map.entry("OĞLAK", """
                    Satürn'ün disiplinli gücüyle doğan Oğlak enerjisi, kararlılığınızı ve \
                    hedeflerinize olan bağlılığınızı yansıtıyor. Toprak elementinin en dayanıklı \
                    ifadesi olan siz, zamanla olgunlaşan ve güçlenen nadir ruhlardansınız. \
                    Doğum haritanız, başarının sabır ve azimle geldiğini gösteriyor. Satürn'ün \
                    dersleri zorlu olabilir ama her biri sizi daha güçlü kılar. Dağın zirvesine \
                    adım adım tırmanıyorsunuz; manzara orada muhteşem olacak."""),
            Map.entry("KOVA", """
                    Uranüs'ün yenilikçi enerjisiyle doğan Kova, özgünlüğünüzü ve insanlığa olan \
                    sevginizi yansıtıyor. Hava elementinin en devrimci ifadesi olan siz, \
                    geleceği bugünden görebilen vizyoner ruhlardansınız. Doğum haritanız, \
                    toplumsal değişime katkıda bulunmanın kozmik göreviniz olduğunu gösteriyor. \
                    Farklı olmaktan korkmayın; evren, kalıpları kıranları sever. \
                    İç özgürlüğünüzü kimseye teslim etmeyin."""),
            Map.entry("BALIK", """
                    Neptün'ün rüya gibi enerjisiyle doğan Balık, sezgisel derinliğinizi ve \
                    evrensel şefkatinizi yansıtıyor. Su elementinin en mistik ifadesi olan siz, \
                    görünmeyeni hissedebilen ve rüyalarla konuşabilen nadir ruhlardansınız. \
                    Doğum haritanız, sanatsal ve spiritüel yeteneklerinizin kozmik hediyeler \
                    olduğunu gösteriyor. Sezgilerinize güvenin; onlar yıldızların size fısıltısıdır. \
                    Hayal gücünüz sınırsızdır, onu gerçeğe dönüştürmenin zamanı geldi.""")
    );

    private static final String DREAM_FALLBACK = """
            Rüyanız, bilinçaltınızın derinliklerinden yükselen anlamlı sembollerle dolu. \
            Kadim rüya tabircilerine göre, bu rüya ruhunuzun bir dönüşüm sürecinden \
            geçtiğine işaret ediyor. Rüyanızdaki imgeler, içsel bilgeliğinizin size \
            gönderdiği mesajlardır.

            Bilinçaltınız, farkında olmadığınız duyguları ve düşünceleri rüyalar aracılığıyla \
            yüzeye çıkarıyor. Bu rüya, hayatınızdaki önemli bir değişime hazırlanmanız \
            gerektiğini fısıldıyor. Semboller, yeni fırsatların kapıda olduğunu ve \
            cesaretli adımlar atmanız gerektiğini gösteriyor.

            Önümüzdeki dönemde sezgilerinize daha çok güvenin. Evren, size rüyalar \
            aracılığıyla rehberlik ediyor. Meditasyon ve günlük tutma, bu mesajları \
            daha iyi anlamanıza yardımcı olacaktır. Ruhunuz büyüyor ve gelişiyor; \
            bu rüya bunun en güzel kanıtıdır.""";

    private static final String TAROT_FALLBACK = """
            Kartlar, evrenin size gönderdiği kutsal mesajları taşıyor. Bu açılımda \
            çekilen kartlar, hayatınızdaki önemli temaları ve enerji akışlarını yansıtıyor.

            Geçmişten gelen dersler, şimdiki anın gücü ve geleceğin vaatleri, \
            kartların dans eden enerjisinde bir araya geliyor. Evren, size cesaret \
            ve bilgelik arasında bir denge kurmanız gerektiğini söylüyor.

            Kartların mesajı açık: İç sesinize güvenin, korkularınızla yüzleşin ve \
            kalbinizin gösterdiği yolda yürüyün. Her kart, ruhunuzun farklı bir \
            yönünü aydınlatıyor. Bu açılım, özgür iradenizin gücünü hatırlatıyor.

            Unutmayın, kartlar kesin bir kader çizmez; size olasılıkları gösterir. \
            Son karar her zaman sizindir. Evren, doğru yolda olduğunuzu onaylıyor \
            ve sizi desteklemeye devam ediyor.""";

    private static final String GENERIC_FALLBACK = """
            Kozmik enerjiler, ruhunuzun etrafında anlamlı bir dans sergiliyor. \
            Evrenin kadim bilgeliği, size önemli mesajlar gönderiyor.

            Bu dönemde iç sesinize kulak vermeniz büyük önem taşıyor. Yıldızlar, \
            kişisel gelişiminiz için güçlü bir enerji akışı sunuyor. Geçmişin \
            dersleri, bugünün farkındalığı ve yarının umutları bir bütün oluşturuyor.

            Ruhsal yolculuğunuzda yeni bir sayfa açılıyor. Cesaretle ilerleyin, \
            çünkü evren sizi destekliyor. Sezgilerinize güvenin, kalbinizin \
            bilgeliğini dinleyin ve hayatınıza pozitif değişimlere açık olun.

            Kadim bilgelik der ki: "Her son yeni bir başlangıcın tohumudur." \
            Bu dönem, dönüşüm ve yenilenme zamanıdır. Kozmik rehberlik, \
            doğru yolda olduğunuzu ve büyük şeylerin kapıda olduğunu gösteriyor.""";

    /**
     * Generates a fallback interpretation by analyzing the prompt content.
     */
    public String generateFallback(String prompt) {
        logger.info("Generating mock fallback interpretation");

        if (prompt == null || prompt.isEmpty()) {
            return GENERIC_FALLBACK;
        }

        String upperPrompt = prompt.toUpperCase();

        // Check for zodiac signs in the prompt
        for (Map.Entry<String, String> entry : ZODIAC_INTERPRETATIONS.entrySet()) {
            if (upperPrompt.contains(entry.getKey())) {
                return entry.getValue();
            }
        }

        // Check for analysis type keywords
        if (upperPrompt.contains("RÜYA") || upperPrompt.contains("DREAM")) {
            return DREAM_FALLBACK;
        }

        if (upperPrompt.contains("TAROT") || upperPrompt.contains("KART")) {
            return TAROT_FALLBACK;
        }

        return GENERIC_FALLBACK;
    }

    /**
     * Generates a fallback specifically for tarot interpretations.
     */
    public String generateTarotFallback() {
        return TAROT_FALLBACK;
    }
}
