import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from '../../utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import Reanimated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type {
  HousePlacement,
  NatalHouseComboInsight,
  PlanetPosition,
} from '../../services/astrology.service';
import { getPlanetName, getZodiacInfo } from '../../constants/zodiac';
import { getHouseGlossary } from '../../constants/astrology-glossary';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import { useBottomSheetDragGesture } from '../ui/useBottomSheetDragGesture';
import type { NatalHouseReading } from '../../services/natalPortrait.service';
import { HouseReadingBody } from '../../features/natal/components/ReadingBody';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  visible: boolean;
  house: HousePlacement | null;
  planetsInHouse?: PlanetPosition[];
  insight?: NatalHouseComboInsight | null;
  /**
   * The redesigned reading: cusp sign, ruler placement and residents read as one picture.
   * When present it replaces the legacy template lines; the glossary and degrees stay below
   * as the technical layer. Absent for saved companion profiles, which have no portrait.
   */
  reading?: NatalHouseReading | null;
  onClose: () => void;
};

function looksTurkish(text?: string | null): boolean {
  if (!text) return false;
  return /[çğıöşüİ]|\b(ev|burç|yönetici|kimlik|beden|duygusal|dikkat|özellikler|gezegen)\b/i.test(text);
}

type HouseSharpCopy = {
  intro: string;
  characterFocus: string;
  effect: string;
  caution: string;
  strengths: string[];
};

const HOUSE_SHARP_COPY_TR: Record<number, HouseSharpCopy> = {
  1: {
    intro: 'imaj, beden dili ve ilk refleks. Haritanın giriş kapısıdır; hayata ilk temasın burada okunur.',
    characterFocus: 'İnsanlar seni önce bu tavırla okur; fiziksel duruş, mimik ve ilk hamle burada keskinleşir.',
    effect: 'Kararların görünürlük, öz savunma ve “ben buradayım” deme biçimin üzerinden hızla okunur.',
    caution: 'Kendini kanıtlama baskısı yükseldiğinde doğal sıcaklığını performansa çevirmemeye dikkat et.',
    strengths: ['kişisel marka', 'ilk hamle cesareti', 'beden farkındalığı'],
  },
  2: {
    intro: 'para refleksi, öz değer ve sahip oldukların. Güveni nasıl somutlaştırdığını gösterir.',
    characterFocus: 'Kaynaklarını seçme, tutma ve koruma biçimin bu burcun refleksiyle çalışır.',
    effect: 'Kazanç, harcama, yetenek ve öz değer kararlarında güven ihtiyacın doğrudan devreye girer.',
    caution: 'Değerini banka hesabı, sahip oldukların veya başkalarının onayıyla ölçmeye başladığında alan daralır.',
    strengths: ['kaynak yönetimi', 'öz değer farkındalığı', 'somut güven kurma'],
  },
  3: {
    intro: 'zihin temposu, söz ve yakın çevre. Bilgiyi nasıl aldığını ve nasıl dolaşıma soktuğunu anlatır.',
    characterFocus: 'Konuşma hızın, öğrenme yöntemin ve yakın çevreyle bağ kurma tarzın burada görünür olur.',
    effect: 'Gündelik kararların çoğu bilgi toplama, soru sorma, anlatma ve bağlantı kurma refleksinden beslenir.',
    caution: 'Zihnin hızlandığında dağılma, fazla açıklama veya aynı konuyu tekrar tekrar çevirme eğilimini izle.',
    strengths: ['iletişim çevikliği', 'öğrenme kapasitesi', 'yakın çevre yönetimi'],
  },
  4: {
    intro: 'kök aile, mahrem alan ve iç güven. Kendini nerede ait ve korunmuş hissettiğini gösterir.',
    characterFocus: 'Ev, aile ve mahremiyet konularına yaklaşımın bu burcun savunma mekanizmasıyla şekillenir.',
    effect: 'Duygusal kararların çoğu çocukluk hafızası, aidiyet ihtiyacı ve iç huzur arayışı üzerinden çalışır.',
    caution: 'Geçmişi korumak isterken bugünkü ihtiyaçlarını susturmamaya dikkat et.',
    strengths: ['aidiyet kurma', 'duygusal köklenme', 'özel alan bilinci'],
  },
  5: {
    intro: 'yaratım, flört ve sahne alma. Keyif, aşk ve yaratıcı risk iştahını gösterir.',
    characterFocus: 'Sevilme, fark edilme, üretme ve oyun kurma biçimin bu burcun imzasını taşır.',
    effect: 'Romantizmde, hobilerde ve kendini gösterdiğin alanlarda kalbini nasıl sahneye koyduğun belirginleşir.',
    caution: 'Takdir arayışı yükseldiğinde keyfi yarışa, flörtü de onay testine çevirmemeye dikkat et.',
    strengths: ['yaratıcı ifade', 'romantik canlılık', 'risk alma cesareti'],
  },
  6: {
    intro: 'iş disiplini, sağlık rutini ve fayda. Günlük hayatı hangi sistemle toparladığını anlatır.',
    characterFocus: 'Çalışma biçimin, beden bakımın ve fayda üretme tarzın burada netleşir.',
    effect: 'Rutin, görev, verimlilik ve hizmet kararlarında küçük alışkanlıkların büyük sonuç üretebilir.',
    caution: 'Düzen kurma isteği bedeni dinlemeyi bastırdığında yorgunluk birikir.',
    strengths: ['ritim kurma', 'işlevsel zeka', 'beden-rutin takibi'],
  },
  7: {
    intro: 'partnerlik, sözleşme ve açık rakipler. Karşı tarafa nasıl yaklaştığını gösterir.',
    characterFocus: 'İlişkide neyi müzakere ettiğin, neyi aynaladığın ve kimi partner seçtiğin burada okunur.',
    effect: 'Evlilik, ortaklık, müşteri ve açık rekabet alanlarında ben-sen dengesi ana karar motorun olur.',
    caution: 'Uyum uğruna kendi pozisyonunu silikleştirirsen ilişki dengesi yüzeyde kalır.',
    strengths: ['müzakere becerisi', 'partner seçimi farkındalığı', 'ben-sen dengesi'],
  },
  8: {
    intro: 'kriz, mahremiyet ve ortak para. Kontrol, güven ve dönüşüm eşiğini gösterir.',
    characterFocus: 'Yakınlık, sır, borç-alacak, miras ve psikolojik derinlik konularına bu burcun savunmasıyla girersin.',
    effect: 'Kriz anında neyi tuttuğun, neyi bıraktığın ve kiminle kaynak paylaştığın netleşir.',
    caution: 'Güven ararken her şeyi kontrol etmeye çalışırsan dönüşüm değil kilitlenme üretirsin.',
    strengths: ['kriz yönetimi', 'psikolojik derinlik', 'mahremiyet sezgisi'],
  },
  9: {
    intro: 'inanç sistemi, uzaklar ve yüksek eğitim. Hayata hangi anlam haritasıyla baktığını gösterir.',
    characterFocus: 'Fikirlerini büyütme, öğrenme, öğretme ve yabancı kültürlerle temas etme biçimin burada belirginleşir.',
    effect: 'Akademi, yayıncılık, yolculuk, etik ve dünya görüşü kararlarında ufuk genişletme ihtiyacı çalışır.',
    caution: 'Haklı olma arzusu yükseldiğinde fikrini mutlak doğruya çevirmemeye dikkat et.',
    strengths: ['vizyon kurma', 'öğretme kapasitesi', 'anlam üretme'],
  },
  10: {
    intro: 'kariyer yönü, otorite ve itibar. Toplum önündeki rolünü nasıl inşa ettiğini gösterir.',
    characterFocus: 'Hedef koyma, sorumluluk alma ve görünür başarı üretme biçimin bu burcun diliyle çalışır.',
    effect: 'Meslek, statü, yönetici figürleri ve uzun vadeli hedeflerde görünür sonuç alma ihtiyacın belirginleşir.',
    caution: 'Başarı baskısı özel hayatını ve iç ritmini tamamen gölgede bırakırsa hedef mekanikleşir.',
    strengths: ['stratejik hedef', 'itibar inşası', 'sorumluluk alma'],
  },
  11: {
    intro: 'ağlar, ekipler ve gelecek planı. Kişisel hedefini kolektif alana nasıl taşıdığını anlatır.',
    characterFocus: 'Arkadaşlık, network, ekip ve topluluk içindeki rolün burada şekillenir.',
    effect: 'Projeler, sosyal çevre ve gelecek planlarında kiminle yürüdüğün en az hedefin kadar belirleyici olur.',
    caution: 'Gruba ait olma isteği özgün fikrini yumuşatıyorsa yönünü yeniden kalibre et.',
    strengths: ['network kurma', 'kolektif zeka', 'gelecek vizyonu'],
  },
  12: {
    intro: 'bilinçdışı, kapanış ve inziva. Görünmeyen yükleri ve içsel arka planı gösterir.',
    characterFocus: 'Yalnız kalınca çalışan sezgilerin, kaçış reflekslerin ve ruhsal savunmaların burada görünür olur.',
    effect: 'Dinlenme, kapanış, affetme ve içe çekilme dönemlerinde psikolojik temizlik ihtiyacı belirginleşir.',
    caution: 'Sessizliği iyileşme alanı yerine kaçış alanına çevirdiğinde destek istemeyi geciktirebilirsin.',
    strengths: ['iç gözlem', 'sezgisel temizlik', 'geri çekilme bilgeliği'],
  },
};

const SIGN_TONE_TR: Record<string, string> = {
  ARIES: 'atak, doğrudan ve sabırsız',
  TAURUS: 'sabit, bedensel ve güven arayan',
  GEMINI: 'hızlı, meraklı ve bağlantı kuran',
  CANCER: 'koruyucu, hafızalı ve duygusal güven odaklı',
  LEO: 'görünür, sıcak ve gururlu',
  VIRGO: 'analitik, seçici ve işlev odaklı',
  LIBRA: 'ilişki odaklı, estetik ve denge arayan',
  SCORPIO: 'yoğun, kontrollü ve derin',
  SAGITTARIUS: 'ufuk açan, açık sözlü ve anlam arayan',
  CAPRICORN: 'stratejik, ölçülü ve sonuç odaklı',
  AQUARIUS: 'özgün, mesafeli ve sistem dışı düşünen',
  PISCES: 'sezgisel, geçirgen ve şefkatli',
};

const SIGN_DECISION_TR: Record<string, string> = {
  ARIES: 'hızlı ve doğrudan',
  TAURUS: 'temkinli ve güven arayarak',
  GEMINI: 'konuşarak, kıyaslayarak ve bilgi toplayarak',
  CANCER: 'duygusal güveni kontrol ederek',
  LEO: 'görünürlük ve kalp cesaretiyle',
  VIRGO: 'detayları ayıklayıp işlev kurarak',
  LIBRA: 'denge, estetik ve karşı tarafı hesaba katarak',
  SCORPIO: 'derin gözlem ve kontrol ihtiyacıyla',
  SAGITTARIUS: 'anlam, özgürlük ve büyük resim arayarak',
  CAPRICORN: 'plan, sınır ve somut sonuç üzerinden',
  AQUARIUS: 'mesafe alıp objektif bakarak',
  PISCES: 'sezgi, empati ve akış hissiyle',
};

const PLANET_ACTION_TR: Record<string, string> = {
  Sun: 'öz ifade ve görünürlük ihtiyacını',
  Moon: 'duygusal güven refleksini',
  Mercury: 'zihin, söz ve öğrenme temposunu',
  Venus: 'ilişki, zevk ve değer seçimini',
  Mars: 'ataklık, öfke ve mücadele gücünü',
  Jupiter: 'büyüme iştahı ve inanç alanını',
  Saturn: 'sınır, sorumluluk ve olgunlaşma dersini',
  Uranus: 'özgürleşme ve kopuş ihtiyacını',
  Neptune: 'idealizasyon, sezgi ve belirsizlik hassasiyetini',
  Pluto: 'güç, kriz ve dönüşüm basıncını',
  Chiron: 'hassasiyet ve iyileştirme bilgisini',
  NorthNode: 'gelişim yönünü',
};

function trLower(text: string): string {
  return text.toLocaleLowerCase('tr-TR');
}

function signToneTr(sign?: string | null): string {
  return SIGN_TONE_TR[sign?.toUpperCase() ?? ''] ?? 'kendine özgü';
}

function signDecisionTr(sign?: string | null): string {
  return SIGN_DECISION_TR[sign?.toUpperCase() ?? ''] ?? 'kendine göre';
}

function planetActionTr(planet?: string | null): string {
  return PLANET_ACTION_TR[planet ?? ''] ?? 'gezegen enerjisini';
}

function buildHouseLines(house: HousePlacement | null, locale: string, planetsInHouse?: PlanetPosition[]) {
  if (!house) return null;
  const isEnglish = locale.startsWith('en');
  const info = getHouseGlossary(house.houseNumber, locale);
  const signInfo = getZodiacInfo(house.sign, locale);
  const houseCopy = isEnglish ? undefined : HOUSE_SHARP_COPY_TR[house.houseNumber];
  const simpleTerm = info?.shortDesc ?? `${house.houseNumber}. ev teması`;
  const housePlanets = (planetsInHouse ?? []).filter((p) => p.house === house.houseNumber);

  const fallbackTheme = isEnglish ? `House ${house.houseNumber} themes` : `${house.houseNumber}. ev teması`;
  const basicIntro = houseCopy
    ? `${house.houseNumber}. Ev: ${houseCopy.intro}`
    : isEnglish
    ? `${house.houseNumber}th House: ${simpleTerm.charAt(0).toUpperCase()}${simpleTerm.slice(1)}. Even if you know nothing about astrology, this area shows how these themes work in your life.`
    : `${house.houseNumber}. Ev: ${simpleTerm.charAt(0).toUpperCase()}${simpleTerm.slice(1)}. Astrolojiyi hiç bilmesen bile burası “hayatında bu konuların nasıl çalıştığını” anlatır.`;
  const character = houseCopy
    ? `${signInfo.name} başlangıcı bu alanı ${signToneTr(house.sign)} çalıştırır. ${houseCopy.characterFocus}`
    : isEnglish
    ? `When this house begins with ${signInfo.name} (${signInfo.element}), your approach in this area tends to operate through a ${signInfo.name.toLowerCase()} tone.`
    : `Bu evin ${signInfo.name} (${signInfo.element}) ile başlaması, bu alanda yaklaşımının ${signInfo.name.toLowerCase()} tonuyla çalıştığını gösterir.`;
  const impact = houseCopy
    ? `${houseCopy.effect} Bu yüzden ${signDecisionTr(house.sign)} ilerleme eğilimin bu evde belirginleşir.`
    : isEnglish
    ? `${info?.longDesc ?? 'This house carries an important life theme for you.'} Because of this, the decisions you make here can directly shape your confidence and daily choices.`
    : `${info?.longDesc ?? 'Bu ev, hayatının önemli bir temasını taşır.'} Bu yüzden burada aldığın kararlar öz güvenini ve günlük seçimlerini doğrudan etkileyebilir.`;
  const caution = houseCopy?.caution ?? (house.houseNumber === 2
    ? (isEnglish ? 'Try not to tie your sense of worth only to material results.' : 'Değer duygunu sadece maddi sonuçlara bağlamamaya dikkat et.')
    : house.houseNumber === 7
      ? (isEnglish ? 'Clarifying your boundaries in partnerships does not break harmony; it strengthens the relationship.' : 'Partnerliklerde sınırlarını netleştirmek, uyumu bozmaz; aksine ilişkiyi güçlendirir.')
      : house.houseNumber === 8
        ? (isEnglish ? 'When the need for control rises, returning to trust through small steps helps.' : 'Kontrol ihtiyacı yükseldiğinde güven inşasına küçük adımlarla dönmek iyi gelir.')
        : (isEnglish ? 'Instead of locking yourself into a single truth in this area, it is healthier to observe your rhythm over time.' : 'Bu ev temasında tek bir doğruya sıkışmak yerine ritmini zamanla gözlemlemek daha sağlıklıdır.'));
  const strengths = houseCopy?.strengths.join(', ') ?? (house.houseNumber === 10
    ? (isEnglish ? 'Setting goals, being visible, taking responsibility' : 'Hedef koyma, görünür olma, sorumluluk alma')
    : house.houseNumber === 4
      ? (isEnglish ? 'Rooting, protecting, creating belonging' : 'Köklenme, koruma, aidiyet kurma')
      : house.houseNumber === 3
        ? (isEnglish ? 'Communication, learning, building connections' : 'İletişim, öğrenme, bağlantı kurma')
        : (isEnglish ? 'Building awareness, creating balance, using resources wisely' : 'Farkındalık geliştirme, denge kurma, doğru kaynak kullanımı'));

  const comboSummary = housePlanets.length
    ? housePlanets.slice(0, 3).map((p) => {
        const pName = getPlanetName(p.planet, locale);
        const pSign = getZodiacInfo(p.sign, locale);
        return isEnglish
          ? `${pName} in ${pSign.name}, placed in House ${house.houseNumber}, activates the theme of ${simpleTerm.toLowerCase()} through a ${pSign.name.toLowerCase()} style.`
          : `${pName} ${pSign.name} burcunda ${house.houseNumber}. evde: ${trLower(simpleTerm)} alanına ${planetActionTr(p.planet)} getirir; bunu ${signDecisionTr(p.sign)} çalıştırır.`;
      }).join(' ')
    : isEnglish
      ? `There may be few visible planetary placements in this house; even so, the ${signInfo.name.toLowerCase()} opening tone shapes how you experience the theme of ${simpleTerm.toLowerCase() || fallbackTheme.toLowerCase()}.`
      : `Bu evde yerleşik gezegen yoksa tema pasif değildir; ${signInfo.name} kapısı transitlerle tetiklendiğinde ${trLower(simpleTerm)} konularını ${signDecisionTr(house.sign)} açar.`;

  return { info, signInfo, basicIntro, character, impact, caution, strengths, comboSummary, housePlanets };
}

export default function HouseBottomSheet({
  visible,
  house,
  planetsInHouse,
  insight,
  reading,
  onClose,
}: Props) {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'tr';
  const isEnglish = locale.startsWith('en');
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const { animatedStyle, gesture } = useBottomSheetDragGesture({
    enabled: visible,
    onClose,
  });

  useEffect(() => {
    if (visible) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, backdropAnim, slideAnim]);

  const lines = buildHouseLines(house, locale, planetsInHouse);
  if (!house || !lines) return null;
  const insightStrengths = insight?.strengths?.filter(Boolean).join(', ');
  const useFallbackInsightText = isEnglish && (
    looksTurkish(insight?.introLine)
    || looksTurkish(insight?.characterLine)
    || looksTurkish(insight?.effectLine)
    || looksTurkish(insight?.cautionLine)
    || looksTurkish(insight?.comboSummary)
    || looksTurkish(insightStrengths)
  );
  const introLine = !useFallbackInsightText && insight?.introLine ? insight.introLine : lines.basicIntro;
  const characterLine = !useFallbackInsightText && insight?.characterLine ? insight.characterLine : lines.character;
  const effectLine = !useFallbackInsightText && insight?.effectLine ? insight.effectLine : lines.impact;
  const cautionLine = !useFallbackInsightText && insight?.cautionLine ? insight.cautionLine : lines.caution;
  const strengthsLine = !useFallbackInsightText && insightStrengths ? insightStrengths : lines.strengths;
  const comboSummary = !useFallbackInsightText && insight?.comboSummary ? insight.comboSummary : lines.comboSummary;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={s.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[s.backdrop, { opacity: backdropAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <GestureDetector gesture={gesture}>
            <Reanimated.View style={animatedStyle}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
              <View>
                <View style={s.handleBar} />

                <View style={s.header}>
                  <View style={[s.houseBadge, { backgroundColor: colors.violetBg }]}>
                    <Text style={[s.houseBadgeText, { color: colors.violet }]}>{isEnglish ? `House ${house.houseNumber}` : `${house.houseNumber}. Ev`}</Text>
                  </View>
                  <Text style={s.headerTitle}>
                    {isEnglish ? `House ${house.houseNumber}` : `${house.houseNumber}. Ev`} • {lines.signInfo.symbol} {lines.signInfo.name}
                  </Text>
                  <Text style={s.headerSub}>{reading?.whatItMeans ?? introLine}</Text>
                  <Text style={s.headerMeta}>{Math.floor(house.degree)}° • {isEnglish ? 'Ruler' : 'Yönetici'}: {getPlanetName(house.ruler, locale)}</Text>
                </View>
              </View>

              {reading ? (
                <HouseReadingBody reading={reading} locale={locale} />
              ) : (
                <>
                  <View style={s.lineList}>
                    <LineItem icon="sparkles-outline" title={isEnglish ? 'Character Analysis' : 'Karakter Analizi'} text={characterLine} colors={colors} />
                    <LineItem icon="rocket-outline" title={isEnglish ? 'How It Affects You' : 'Seni Nasıl Etkiler?'} text={effectLine} colors={colors} />
                    <LineItem icon="warning-outline" title={isEnglish ? 'Watch Out For' : 'Dikkat Etmen Gerekenler'} text={cautionLine} colors={colors} />
                    <LineItem icon="star-outline" title={isEnglish ? 'Key Strengths' : 'Öne Çıkan Özellikler'} text={strengthsLine} colors={colors} />
                  </View>

                  <View style={[s.comboBox, { backgroundColor: colors.primaryTint, borderColor: colors.border }]}>
                    <Text style={s.comboTitle}>{isEnglish ? 'Planet + House + Sign Combination' : 'Gezegen + Ev + Burç Kombinasyonu'}</Text>
                    <Text style={s.comboText}>{comboSummary}</Text>
                  </View>
                </>
              )}

              {lines.info && (
                <View style={[s.glossaryBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={s.glossaryTitle}>{lines.info.term}</Text>
                  <Text style={s.glossaryText}>{lines.info.longDesc}</Text>
                </View>
              )}

              <Pressable style={[s.closeBtn, { backgroundColor: colors.violet }]} onPress={onClose}>
                <Text style={s.closeBtnText}>{isEnglish ? 'Close' : 'Kapat'}</Text>
              </Pressable>
            </ScrollView>
            </Reanimated.View>
          </GestureDetector>
        </Animated.View>
      </View>
    </Modal>
  );
}

function LineItem({
  icon,
  title,
  text,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  colors: ThemeColors;
}) {
  return (
    <View style={[stylesShared.item, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[stylesShared.iconWrap, { backgroundColor: colors.primaryTint }]}>
        <Ionicons name={icon} size={14} color={colors.violet} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[stylesShared.itemTitle, { color: colors.textSlate }]}>{title}</Text>
        <Text style={[stylesShared.itemText, { color: colors.textMuted }]}>{text}</Text>
      </View>
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)' },
    sheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: SCREEN_HEIGHT * 0.82,
      borderWidth: 1,
      borderColor: C.border,
    },
    content: { paddingHorizontal: 18, paddingBottom: 28, gap: 12 },
    handleBar: {
      alignSelf: 'center',
      width: 44,
      height: 4,
      borderRadius: 4,
      backgroundColor: C.borderLight,
      marginTop: 12,
    },
    header: { gap: 6, marginTop: 4 },
    houseBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    houseBadgeText: { fontSize: 12, fontWeight: '800' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: C.textSlate },
    headerSub: { fontSize: 13, lineHeight: 19, color: C.textMuted },
    headerMeta: { fontSize: 12, color: C.muted, fontWeight: '600' },
    lineList: { gap: 8 },
    comboBox: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 12,
      gap: 6,
    },
    comboTitle: { fontSize: 12.5, fontWeight: '800', color: C.violet },
    comboText: { fontSize: 12.5, lineHeight: 18, color: C.textMuted },
    glossaryBox: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 12,
      gap: 6,
    },
    glossaryTitle: { fontSize: 12.5, fontWeight: '800', color: C.textSlate },
    glossaryText: { fontSize: 12.5, lineHeight: 18, color: C.textMuted },
    closeBtn: {
      minHeight: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  });
}

const stylesShared = StyleSheet.create({
  item: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  itemText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});
