import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import OnboardingBackground from '../../components/OnboardingBackground';
import ServiceStatus from '../../components/ServiceStatus';
import CollectivePulseWidget from '../../components/CollectivePulseWidget';
import { useAuthStore } from '../../store/useAuthStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import {
  fetchSkyPulse,
  fetchLatestNatalChart,
  fetchWeeklySwot,
  NatalChartResponse,
  SkyPulseResponse,
  WeeklySwotResponse,
  SwotPoint,
} from '../../services/astrology.service';
import { DailySecret, fetchDailySecret } from '../../services/oracle.service';
import { useNatalChartStore } from '../../store/useNatalChartStore';

const COLORS = {
  background: '#F9F7FB',
  text: '#1E1E1E',
  subtext: '#7A7A7A',
  border: '#E6E1EA',
  primary: '#9D4EDD',
  primarySoft: '#F1E8FD',
  accent: '#2E4A9C',
  green: '#3FA46A',
  red: '#C04A4A',
};

const SERVICE_SLIDES = [
  { id: 'planner', title: 'Kozmik Planlayici', emoji: '📅' },
  { id: 'dream', title: 'Ruya Analizi', emoji: '🌙' },
  { id: 'numerology', title: 'Numeroloji', emoji: '🔢' },
  { id: 'weekly', title: 'Haftanin Analizi', emoji: '📅' },
  { id: 'natal', title: 'Dogum Haritasi', emoji: '⭐' },
  { id: 'name', title: 'Isim Analizi', emoji: '🧿' },
];

const DAILY_VIBE_FALLBACKS = [
  'Bugun acele etmeden ilerle; dogru an seni bulacak.',
  'Kucuk bir karar gunun ritmini tamamen degistirebilir.',
  'Sessiz bir an yakala, cevaplar orada netlesecek.',
  'Kalbini hafifleten secenegi sec; gun onunla acilacak.',
];

const RETRO_CAUTION_MAP: Record<string, string> = {
  'Merkür': 'Sözleşme ve önemli kararları ertele; mesajlar yanlış anlaşılabilir.',
  'Venüs': 'Duygusal kararlar için acele etme; eski ilişkiler gündeme gelebilir.',
  'Mars': 'Agresif hamlelerden kaçın; enerjiyi savunmaya ve planlamaya yönelt.',
  'Jüpiter': 'Aşırı iyimserlikten sakın; büyük risk almadan önce iki kez düşün.',
  'Satürn': 'Yapılar test ediliyor; sabırlı ol ve mevcut taahhütlere sadık kal.',
  'Uranüs': 'Ani değişimlere karşı hazırlıklı ol; esnekliğini koru.',
  'Neptün': 'Yanıltıcı durumlar olabilir; sezgine güven ama netlik ara.',
  'Plüton': 'Derin dönüşümler sürüyor; kontrol edemeyeceklerini bırak.',
};

const ACTION_MAP: Record<string, Record<'lucky' | 'mixed' | 'caution', string[]>> = {
  ask: {
    lucky: ['Kalbinde sakladığın o sözü bugün söyleyebilirsin.', 'Bağı güçlendiren beklenmedik bir jest yap.'],
    mixed: ['Duygusal konuşmaları dikkatli yönet; sabırlı ol.', 'Sezgine güven ama hızlı karar verme.'],
    caution: ['Hassas ilişki konularını bugün ertelemeyi düşün.', 'Dinlemeye odaklan, konuşmaya değil.'],
  },
  para: {
    lucky: ['Ertelediğin finansal adımı bugün atmak için doğru an.', 'Kısa vadeli yatırım için iyi bir gün.'],
    mixed: ['Mali kararlar alırken iki kez kontrol et.', 'Fırsatları değerlendir ama büyük risk alma.'],
    caution: ['Büyük harcama ve yatırım kararlarını birkaç güne ertele.', 'Mevcut finansal düzeni gözden geçir.'],
  },
  kariyer: {
    lucky: ['Liderlik gösterebileceğin bir konuda söz al.', 'Fark yaratacak projeye bugün başla.'],
    mixed: ['Mevcut projeleri güçlendir; yenilerini planlamaya başla.', 'Takım içi iletişimi güçlendir.'],
    caution: ['Müzakere ve pazarlıkları ertele; zemin hazırlamaya odaklan.', 'Hızlı değil, doğru adım at.'],
  },
  aile: {
    lucky: ['Aile içi eski bir gerilimi yumuşatmak için bugün konuş.', 'Sevdiklerinle kaliteli zaman planla.'],
    mixed: ['Ev içi konuşmalarda kelimelerine dikkat et.', 'Dinlemeye öncelik ver.'],
    caution: ['Ev içi hassas konuları bugün ertelemeyi düşün.', 'Sabırlı ve anlayışlı bir tutum benimse.'],
  },
  arkadaslik: {
    lucky: ['Samimi bir bağlantı kurmak için harika bir gün.', 'Uzun süredir görmediğin birine ulaş.'],
    mixed: ['Sosyal planları esnek tut; değişebilirler.', 'Yüzeysel değil, derin bağlantılara odaklan.'],
    caution: ['Sosyal anlaşmazlıklardan kaçın; bugün dinleyici ol.', 'Yeni taahhütler almadan önce düşün.'],
  },
  ticaret: {
    lucky: ['İş birliği teklifi için doğru an.', 'Müzakere masasında güçlü bir pozisyondasın.'],
    mixed: ['Sözleşme detaylarını dikkatlice incele.', 'Ticari kararları aceleci verme.'],
    caution: ['Sözleşme imzalamayı ertele; koşulları yeniden değerlendir.', 'İş ortaklarının niyetlerini sorgula.'],
  },
  genel: {
    lucky: ['Uzun süredir ertelediğin adımı bugün atmak için iyi bir an.', 'Yeni bağlantılar ve fırsatlar için alan aç.'],
    mixed: ['Kararları aceleci verme; bir adım geri çekil, değerlendir.', 'Enerjiyi odaklı tut; dağıtma.'],
    caution: ['Bugün gözlemci kal; hamleni yarına sakla.', 'Mevcut durumu stabilize et, büyütme.'],
  },
};

const SECRET_PATTERNS_BY_FOCUS: Record<string, string[]> = {
  ask: [
    'bugun bir kelimenin tonu, sandigindan daha derin bir yakinlasma baslatabilir.',
    'kisa bir mesajlasma, uzun suredir bekledigin duygusal netligi acabilir.',
  ],
  para: [
    'kucuk bir harcama karari, bu hafta buyuk rahatlik getirecek bir duzene donebilir.',
    'gun icinde duyacagin bir fikir, gelirini sade bir sekilde guclendirebilir.',
  ],
  kariyer: [
    'bugun atilan kucuk bir adim, bir ust seviyeye gecisin kapisini aralayabilir.',
    'gunun ortasinda gelecek bir geri bildirim, yonunu netlestirmen icin isaret olabilir.',
  ],
  aile: [
    'ev icindeki kisa bir konusma, uzun suredir biriken bir konuyu yumusatabilir.',
    'bugun gosterecegin minik bir ilgi, aile baglarini beklediginden hizli guclendirebilir.',
  ],
  arkadaslik: [
    'bugun kuracagin samimi bir baglanti, haftanin en guclu destegi olabilir.',
    'kisa bir bulusma plani, uzun zamandir eksik kalan aidiyet hissini canlandirabilir.',
  ],
  ticaret: [
    'gun icindeki bir tanisma, sandigindan daha verimli bir is birligine donebilir.',
    'kucuk bir pazarlikta sakin kalman, tahminden daha iyi bir sonuc getirebilir.',
  ],
  genel: [
    'bugun fark etmedigin bir isaret senin icin tekrar edecek; ikinciyi kacirma.',
    'gun icinde kisa bir duraklama, uzun suredir bekledigin netligi getirecek.',
  ],
};

const SWOT_ITEMS: Array<{
  id: 'strength' | 'weakness' | 'opportunity' | 'threat';
  title: string;
  icon: string;
  accent: string;
  surface: string;
}> = [
  { id: 'strength', title: 'ICSEL GUC', icon: '⚡', accent: '#7C4DFF', surface: '#F1EAFF' },
  { id: 'opportunity', title: 'ALTIN FIRSAT', icon: '✨', accent: '#009F73', surface: '#E9F8F2' },
  { id: 'threat', title: 'KRITIK UYARI', icon: '🚫', accent: '#E14B4B', surface: '#FFEDEF' },
  { id: 'weakness', title: 'ENERJI KAYBI', icon: '⚠️', accent: '#E08A00', surface: '#FFF4E8' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 20;
const SLIDE_GAP = 0;
const SLIDE_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;
const SLIDE_SNAP = SLIDE_WIDTH + SLIDE_GAP;

function getMoonPhaseIcon(phase: string): string {
  if (phase.includes('Yeni Ay')) return '🌑';
  if (phase.includes('Hilal') && phase.includes('Buyuyen')) return '🌒';
  if (phase.includes('Ilk Dordun')) return '🌓';
  if (phase.includes('Sisken') && phase.includes('Buyuyen')) return '🌔';
  if (phase.includes('Dolunay')) return '🌕';
  if (phase.includes('Sisken') && phase.includes('Kuculen')) return '🌖';
  if (phase.includes('Son Dordun')) return '🌗';
  if (phase.includes('Hilal') && phase.includes('Kuculen')) return '🌘';
  return '🌙';
}

function hashSeed(seed: string): number {
  return seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function normalizeFocus(rawFocus: string | null | undefined): string {
  const focus = (rawFocus ?? '').toLowerCase().trim();
  if (!focus) return 'genel';
  if (focus.includes('ask')) return 'ask';
  if (focus.includes('para')) return 'para';
  if (focus.includes('kariyer')) return 'kariyer';
  if (focus.includes('aile')) return 'aile';
  if (focus.includes('arkadas')) return 'arkadaslik';
  if (focus.includes('ticaret')) return 'ticaret';
  return 'genel';
}

function resolveRelationshipTone(maritalStatus: string | null | undefined): string {
  const status = (maritalStatus ?? '').toLowerCase();
  if (status.includes('evli')) return 'iliski dengesinde';
  if (status.includes('bekar')) return 'kalp alaninda';
  if (status.includes('iliski')) return 'bag kurma enerjisinde';
  return 'gunun akisinda';
}

function buildCuriousSecret(
  name: string,
  daySeed: number,
  focusKey: string,
  maritalStatus: string,
  secretSeed?: string | null
): string {
  const seedBase = `${name}-${daySeed}-${secretSeed ?? ''}`;
  const score = hashSeed(seedBase);
  const patterns = SECRET_PATTERNS_BY_FOCUS[focusKey] ?? SECRET_PATTERNS_BY_FOCUS.genel;
  return `${name}, ${resolveRelationshipTone(maritalStatus)} ${patterns[score % patterns.length]}`;
}

function buildDailyComment(base: string, focusKey: string, maritalStatus: string): string {
  const focusLead: Record<string, string> = {
    ask: 'Ask alaninda',
    para: 'Maddi duzende',
    kariyer: 'Kariyer tarafinda',
    aile: 'Aile iliskilerinde',
    arkadaslik: 'Sosyal baglarda',
    ticaret: 'Is akisinda',
    genel: 'Bugunun akisi',
  };

  const lead = focusLead[focusKey] ?? focusLead.genel;
  return `${lead} ${resolveRelationshipTone(maritalStatus)}, ${base.toLowerCase()}`;
}

function getFocusLabel(focusKey: string): string {
  const labels: Record<string, string> = {
    ask: 'ask',
    para: 'para',
    kariyer: 'kariyer',
    aile: 'aile',
    arkadaslik: 'sosyal baglar',
    ticaret: 'ticaret',
    genel: 'yasam',
  };
  return labels[focusKey] ?? labels.genel;
}

function normalizeAiCopy(value: string | null | undefined): string {
  if (!value) return '';

  return value
    .replace(/\s+/g, ' ')
    .replace(/\b\d+\s*(°|derece|orb|ev|house|yasam yolu|yasam yolunda)\b/gi, '')
    .replace(/\b(kare|ucgen|kavusum|karsit|retrograde|retro)\b/gi, '')
    .replace(/[,:;]\s*$/g, '')
    .trim();
}

function toSingleSentence(value: string, fallback: string, maxLength = 160): string {
  const normalized = normalizeAiCopy(value);
  const parts = normalized.split(/[.!?]/).map((part) => part.trim()).filter(Boolean);
  let sentence = parts[0] || fallback;
  if (sentence.length > maxLength) {
    sentence = sentence.slice(0, maxLength).replace(/\s+\S*$/, '').trim();
  }
  return sentence.endsWith('.') ? sentence : `${sentence}.`;
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = line.toLowerCase();
    if (!line || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const onboardingMaritalStatus = useOnboardingStore((s) => s.maritalStatus);
  const onboardingFocusPoints = useOnboardingStore((s) => s.focusPoints);
  const cachedChart = useNatalChartStore((s) => s.chart);
  const setCachedChart = useNatalChartStore((s) => s.setChart);
  const isChartStale = useNatalChartStore((s) => s.isStale);
  const router = useRouter();
  const sliderRef = useRef<FlatList<(typeof SERVICE_SLIDES)[0]>>(null);

  const [activeSlide, setActiveSlide] = useState(0);
  const [expandedSwotId, setExpandedSwotId] = useState<string | null>(null);

  const [dailySecret, setDailySecret] = useState<DailySecret | null>(null);
  const [secretLoading, setSecretLoading] = useState(true);
  const [secretError, setSecretError] = useState(false);

  const [skyPulse, setSkyPulse] = useState<SkyPulseResponse | null>(null);
  const [skyPulseLoading, setSkyPulseLoading] = useState(true);
  const [skyPulseError, setSkyPulseError] = useState(false);

  const [weeklySwot, setWeeklySwot] = useState<WeeklySwotResponse | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyError, setWeeklyError] = useState(false);
  const [natalChart, setNatalChart] = useState<NatalChartResponse | null>(cachedChart);

  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const moonGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(moonGlow, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(moonGlow, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [moonGlow]);

  const loadDailySecret = useCallback(async () => {
    try {
      setSecretError(false);
      const response = await fetchDailySecret({
        name: user?.name ?? (`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || undefined),
        birthDate: user?.birthDate ?? undefined,
        maritalStatus: user?.maritalStatus ?? onboardingMaritalStatus ?? undefined,
        focusPoint: user?.focusPoint?.split(',')[0] ?? onboardingFocusPoints[0] ?? undefined,
      });
      setDailySecret(response.data);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch {
      setSecretError(true);
    } finally {
      setSecretLoading(false);
    }
  }, [fadeAnim, user]);

  const loadSkyPulse = useCallback(async () => {
    try {
      setSkyPulseError(false);
      const res = await fetchSkyPulse();
      setSkyPulse(res.data);
    } catch {
      setSkyPulseError(true);
    } finally {
      setSkyPulseLoading(false);
    }
  }, []);

  const loadWeeklySwot = useCallback(async () => {
    if (!user?.id) {
      setWeeklySwot(null);
      setWeeklyLoading(false);
      return;
    }

    try {
      setWeeklyError(false);
      const res = await fetchWeeklySwot(user.id);
      setWeeklySwot(res.data);
    } catch {
      setWeeklyError(true);
    } finally {
      setWeeklyLoading(false);
    }
  }, [user?.id]);

  const loadNatalChart = useCallback(async () => {
    if (!user?.id) {
      setNatalChart(null);
      return;
    }

    if (cachedChart && cachedChart.userId === user.id && !isChartStale()) {
      setNatalChart(cachedChart);
      return;
    }

    try {
      const response = await fetchLatestNatalChart(user.id);
      setNatalChart(response.data);
      setCachedChart(response.data);
    } catch {
      if (cachedChart && cachedChart.userId === user.id) {
        setNatalChart(cachedChart);
      }
    }
  }, [cachedChart, isChartStale, setCachedChart, user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setSecretLoading(true);
    setSkyPulseLoading(true);
    setWeeklyLoading(true);
    await Promise.all([loadDailySecret(), loadSkyPulse(), loadWeeklySwot(), loadNatalChart()]);
    setRefreshing(false);
  }, [loadDailySecret, loadSkyPulse, loadWeeklySwot, loadNatalChart]);

  useEffect(() => {
    loadDailySecret();
    loadSkyPulse();
    loadWeeklySwot();
    loadNatalChart();
  }, [loadDailySecret, loadSkyPulse, loadWeeklySwot, loadNatalChart]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % SERVICE_SLIDES.length;
        sliderRef.current?.scrollToOffset({
          offset: next * SLIDE_SNAP,
          animated: true,
        });
        return next;
      });
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const handleSliderScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SLIDE_SNAP);
    setActiveSlide(index);
  };

  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim() || user?.name || 'Misafir';
  const name = firstName || fullName;
  const daySeed = new Date().getDay() + new Date().getDate();
  const selectedFocus = user?.focusPoint?.split(',')[0] ?? onboardingFocusPoints[0] ?? '';
  const focusKey = normalizeFocus(selectedFocus);
  const activeMaritalStatus = user?.maritalStatus || onboardingMaritalStatus || '';

  const aiInsightLines = useMemo(() => {
    return dedupeLines(
      [
        normalizeAiCopy(dailySecret?.message),
        normalizeAiCopy(dailySecret?.astrologyInsight),
        normalizeAiCopy(dailySecret?.dreamInsight),
        normalizeAiCopy(dailySecret?.numerologyInsight),
        normalizeAiCopy(dailySecret?.secret),
      ].filter(Boolean)
    );
  }, [
    dailySecret?.astrologyInsight,
    dailySecret?.dreamInsight,
    dailySecret?.message,
    dailySecret?.numerologyInsight,
    dailySecret?.secret,
  ]);

  const secretText = useMemo(() => {
    if (secretError) {
      return toSingleSentence(
        buildCuriousSecret(name, daySeed, focusKey, activeMaritalStatus, null),
        `${name}, bugun sezgine guven.`,
        110
      );
    }
    return toSingleSentence(
      dailySecret?.secret || dailySecret?.message || '',
      buildCuriousSecret(name, daySeed, focusKey, activeMaritalStatus, dailySecret?.secret ?? null),
      110
    );
  }, [activeMaritalStatus, dailySecret?.message, dailySecret?.secret, daySeed, focusKey, name, secretError]);

  const dailyVibeText = useMemo(() => {
    if (dailySecret?.dailyVibe) return dailySecret.dailyVibe;
    const fallback = DAILY_VIBE_FALLBACKS[daySeed % DAILY_VIBE_FALLBACKS.length];
    return buildDailyComment(fallback, focusKey, activeMaritalStatus);
  }, [activeMaritalStatus, dailySecret?.dailyVibe, daySeed, focusKey]);

  const transitDigest = useMemo(() => {
    const focusLabel = getFocusLabel(focusKey);
    const moonSign = skyPulse?.moonSignTurkish ?? '';
    const risingSign = natalChart?.risingSign ?? '';
    const sunSign = natalChart?.sunSign ?? '';
    const identityTag = [sunSign, risingSign, moonSign].filter(Boolean).slice(0, 2).join(' - ');
    const retrogrades = skyPulse?.retrogradePlanets ?? [];
    const moonPhase = skyPulse?.moonPhase ?? '';

    // Planetary energy assessment
    const hasCriticalRetro = retrogrades.some((p) => p.includes('Merkür') || p.includes('Mars'));
    const isDolunay = moonPhase.includes('Dolunay') || moonPhase.includes('Son Dördün');
    const energyType: 'lucky' | 'mixed' | 'caution' =
      hasCriticalRetro || retrogrades.length >= 3
        ? 'caution'
        : retrogrades.length > 0 || isDolunay
          ? 'mixed'
          : 'lucky';

    const energyLabel =
      energyType === 'caution'
        ? `${retrogrades.slice(0, 2).join(' ve ')} retroda — temkinli, hesaplı ilerle`
        : energyType === 'mixed' && retrogrades.length > 0
          ? `${retrogrades[0]} retroda — bu alanda geri adım at ve gözden geçir`
          : isDolunay
            ? `${moonPhase} — duygular yoğun, farkındalıklı kal`
            : moonPhase
              ? `${moonPhase} enerjisi — gezegenler bugün seni destekliyor`
              : 'Gezegenler bugün seni destekliyor — hamlelerini yap';

    // Caution items from retrograde planets
    const cautionItems: string[] = [];
    for (const planet of retrogrades) {
      for (const [key, msg] of Object.entries(RETRO_CAUTION_MAP)) {
        if (planet.includes(key)) { cautionItems.push(msg); break; }
      }
    }
    if (cautionItems.length === 0 && isDolunay) {
      cautionItems.push('Dolunay duygularını yoğunlaştırır — dürtüsel kararlardan uzak dur.');
    }

    // Action items from focus + energy
    const actionItems: string[] = (ACTION_MAP[focusKey] ?? ACTION_MAP.genel)[energyType] ?? [];

    const headlineSource = aiInsightLines[0] || dailyVibeText;
    const dynamicTitle = identityTag
      ? `${identityTag} etkisi: ${toSingleSentence(headlineSource, headlineSource, 78).replace(/\.$/, '')}`
      : toSingleSentence(headlineSource, headlineSource, 78).replace(/\.$/, '');

    return {
      title: dynamicTitle,
      energyType,
      energyLabel,
      cautionItems: cautionItems.slice(0, 3),
      actionItems: actionItems.slice(0, 2),
    };
  }, [
    aiInsightLines,
    dailyVibeText,
    focusKey,
    natalChart,
    skyPulse?.moonSignTurkish,
    skyPulse?.retrogradePlanets,
    skyPulse?.moonPhase,
  ]);

  const swotDataMap: Record<string, SwotPoint | undefined> = {
    strength: weeklySwot?.strength,
    weakness: weeklySwot?.weakness,
    opportunity: weeklySwot?.opportunity,
    threat: weeklySwot?.threat,
  };

  return (
    <View style={styles.container}>
      <OnboardingBackground />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        <View style={styles.headerRow}>
          <View style={styles.profileBlock}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={16} color={COLORS.subtext} />
            </View>
            <View>
              <Text style={styles.profileTitle}>Profilim</Text>
              <Text style={styles.profileSubtitle}>LV. 2 (%15)</Text>
            </View>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="sparkles" size={18} color={COLORS.subtext} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications" size={18} color={COLORS.subtext} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.greetingText}>Merhaba {fullName}, bugun haritanda neler var bakalim.</Text>

        <View style={styles.transitSection}>
          <Text style={styles.transitSectionTitle}>Bugünün Transitleri</Text>
          <View style={styles.transitCard}>
            {/* Başlık */}
            <View style={styles.transitHeadlineRow}>
              <View style={[
                styles.transitDot,
                {
                  backgroundColor:
                    transitDigest.energyType === 'lucky' ? '#11A773'
                    : transitDigest.energyType === 'caution' ? '#C04A4A'
                    : '#E08A00',
                },
              ]} />
              <Text style={styles.transitHeadline}>{transitDigest.title}</Text>
            </View>

            {/* Gezegen Enerji Bandı */}
            <View style={[
              styles.energyBand,
              {
                backgroundColor:
                  transitDigest.energyType === 'lucky' ? '#E6F7F1'
                  : transitDigest.energyType === 'caution' ? '#FDECEA'
                  : '#FFF4E0',
              },
            ]}>
              <Text style={styles.energyBandIcon}>
                {transitDigest.energyType === 'lucky' ? '🟢' : transitDigest.energyType === 'caution' ? '🔴' : '🟡'}
              </Text>
              <Text style={[
                styles.energyBandText,
                {
                  color:
                    transitDigest.energyType === 'lucky' ? '#0D6E49'
                    : transitDigest.energyType === 'caution' ? '#7B2020'
                    : '#7A4A00',
                },
              ]}>
                {transitDigest.energyLabel}
              </Text>
            </View>

            {/* Günün Enerjisi */}
            <Text style={styles.transitDailyLabel}>Günün Enerjisi</Text>
            <Text style={styles.transitDailyText}>{dailyVibeText}</Text>

            {/* Bugün Yapabileceklerin */}
            {transitDigest.actionItems.length > 0 && (
              <View style={styles.transitDetailBox}>
                <Text style={styles.transitBoxLabel}>⚡ Bugün Yapabileceklerin</Text>
                {transitDigest.actionItems.map((line) => (
                  <View key={line} style={styles.transitPointRow}>
                    <Text style={styles.transitPointMark}>›</Text>
                    <Text style={styles.transitPointText}>{line}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Dikkat Noktaları */}
            {transitDigest.cautionItems.length > 0 && (
              <View style={[styles.transitDetailBox, styles.transitCautionBox]}>
                <Text style={[styles.transitBoxLabel, { color: '#9B3232' }]}>⚠️ Dikkat Noktaları</Text>
                {transitDigest.cautionItems.map((line) => (
                  <View key={line} style={styles.transitPointRow}>
                    <Text style={[styles.transitPointMark, { color: '#9B3232' }]}>›</Text>
                    <Text style={[styles.transitPointText, { color: '#5C1A1A' }]}>{line}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <FlatList
          ref={sliderRef}
          data={SERVICE_SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          snapToInterval={SLIDE_SNAP}
          snapToAlignment="start"
          decelerationRate="fast"
          onMomentumScrollEnd={handleSliderScrollEnd}
          contentContainerStyle={styles.sliderContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={item.id === 'natal' ? 0.7 : 1}
              onPress={() => {
                if (item.id === 'natal') router.push('/(tabs)/natal-chart');
              }}
              style={styles.sliderCard}
            >
              <Text style={styles.sliderEmoji}>{item.emoji}</Text>
              <Text style={styles.sliderText}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />

        <View style={styles.sliderDots}>
          {SERVICE_SLIDES.map((item, index) => (
            <View key={item.id} style={[styles.dot, index === activeSlide && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.wisdomCard}>
          <View style={styles.wisdomHeader}>
            <Ionicons name="eye" size={16} color={COLORS.primary} />
            <Text style={styles.wisdomTitle}>Gunun Sirri</Text>
            <View style={styles.wisdomBadge}>
              <Text style={styles.wisdomBadgeText}>Kisisel Mesaj</Text>
            </View>
          </View>

          {secretLoading ? (
            <View style={styles.wisdomLoading}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.wisdomLoadingText}>Mesaj hazirlaniyor...</Text>
            </View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.wisdomText}>{secretText}</Text>
            </Animated.View>
          )}
        </View>

        {skyPulseLoading ? (
          <View style={[styles.skyPulseCard, styles.skyPulseCenter]}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.skyPulseLoadingText}>Gokyuzu okunuyor...</Text>
          </View>
        ) : skyPulseError || !skyPulse ? (
          <TouchableOpacity style={[styles.skyPulseCard, styles.skyPulseCenter]} onPress={loadSkyPulse}>
            <Ionicons name="cloud-offline-outline" size={20} color={COLORS.subtext} />
            <Text style={styles.skyPulseLoadingText}>Gokyuzu verisi yuklenemedi</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/calendar')}
            style={styles.skyPulseCard}
          >
            <View style={styles.skyPulseLeft}>
              <Animated.Text
                style={[
                  styles.skyPulseMoonIcon,
                  {
                    opacity: moonGlow.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
                    transform: [{ scale: moonGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
                  },
                ]}
              >
                {getMoonPhaseIcon(skyPulse.moonPhase)}
              </Animated.Text>
            </View>
            <View style={styles.skyPulseRight}>
              <Text style={styles.skyPulseSign}>
                {skyPulse.moonSignSymbol} {skyPulse.moonSignTurkish}
              </Text>
              <Text style={styles.skyPulsePhase}>{skyPulse.moonPhase}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} style={{ opacity: 0.6 }} />
          </TouchableOpacity>
        )}

        {/* Collective Dream Pulse Widget */}
        <CollectivePulseWidget onPress={() => router.push('/(tabs)/dreams')} />

        <ServiceStatus />

        <View style={styles.swotSection}>
          <Text style={styles.swotSectionTitle}>Haritanda bu hafta</Text>

          {weeklyLoading ? (
            <View style={styles.swotLoadingCard}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.swotLoadingText}>SWOT analizi yukleniyor...</Text>
            </View>
          ) : weeklyError || !weeklySwot ? (
            <TouchableOpacity style={styles.swotLoadingCard} onPress={loadWeeklySwot}>
              <Ionicons name="refresh" size={16} color={COLORS.primary} />
              <Text style={styles.swotLoadingText}>SWOT analizi alinmadi, tekrar dene</Text>
            </TouchableOpacity>
          ) : (
            SWOT_ITEMS.map((item) => {
              const swotPoint = swotDataMap[item.id];
              const isExpanded = expandedSwotId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.swotCard, { backgroundColor: item.surface, borderColor: `${item.accent}55` }]}
                  activeOpacity={0.85}
                  onPress={() => setExpandedSwotId((prev) => (prev === item.id ? null : item.id))}
                >
                  <View style={styles.swotCardHeader}>
                    <View style={styles.swotCardHeadLeft}>
                      <Text style={styles.swotCardIcon}>{item.icon}</Text>
                      <Text style={[styles.swotCardTitle, { color: item.accent }]}>{item.title}</Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={item.accent}
                    />
                  </View>

                  <Text style={styles.swotCardHeadlineDark}>{swotPoint?.headline ?? 'Bu alan bu hafta aktif.'}</Text>
                  <Text style={styles.swotCardSub}>{swotPoint?.subtext ?? 'Detaylari acmak icin karti sec.'}</Text>

                  {isExpanded && swotPoint && (
                    <View style={styles.swotCardBody}>
                      <Text style={styles.swotCardTip}>Ipuclari: {swotPoint.quickTip}</Text>
                    </View>
                  )}
                  <View style={[styles.swotCardBar, { backgroundColor: item.accent }]} />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 22,
    paddingBottom: 32,
  },
  headerRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  profileBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFEAF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  profileSubtitle: {
    fontSize: 12,
    color: COLORS.subtext,
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1EEF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingText: {
    marginHorizontal: 20,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#2E2E3D',
  },
  skyPulseCard: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(157, 78, 221, 0.25)',
    gap: 12,
  },
  skyPulseLeft: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(157, 78, 221, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skyPulseMoonIcon: {
    fontSize: 26,
  },
  skyPulseRight: {
    flex: 1,
    gap: 2,
  },
  skyPulseSign: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  skyPulsePhase: {
    fontSize: 11,
    color: COLORS.subtext,
    fontStyle: 'italic',
  },
  skyPulseCenter: {
    justifyContent: 'center',
  },
  skyPulseLoadingText: {
    fontSize: 12,
    color: COLORS.subtext,
    fontStyle: 'italic',
  },
  sliderContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    marginTop: 12,
  },
  sliderCard: {
    width: SLIDE_WIDTH,
    height: 50,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3C55A8',
    shadowColor: '#2E4A9C',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sliderEmoji: {
    fontSize: 16,
  },
  sliderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sliderDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D8D1E2',
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 14,
  },
  transitSection: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  transitSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5A4D6F',
    marginBottom: 8,
  },
  transitCard: {
    backgroundColor: '#F5ECFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#D0B2F0',
    shadowColor: '#8F58D8',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 2,
  },
  transitHeadlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  transitDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
    marginTop: 4,
  },
  transitHeadline: {
    flex: 1,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
    color: '#235C4C',
  },
  energyBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  energyBandIcon: {
    fontSize: 14,
  },
  energyBandText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  transitDailyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7E4BCF',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  transitDailyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1F1F2A',
    marginBottom: 10,
  },
  transitDetailBox: {
    backgroundColor: '#EDE0F8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D0B8EA',
    gap: 6,
    marginBottom: 8,
  },
  transitCautionBox: {
    backgroundColor: '#FDECEA',
    borderColor: '#F5BFBF',
  },
  transitBoxLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5A2D8A',
    marginBottom: 4,
  },
  transitPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  transitPointMark: {
    marginRight: 6,
    fontSize: 15,
    lineHeight: 22,
    color: '#5A2D8A',
    fontWeight: '700',
  },
  transitPointText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#292934',
  },
  wisdomCard: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#FFF8EA',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F2D9A8',
  },
  wisdomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  wisdomBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F0E6FF',
    borderWidth: 1,
    borderColor: '#D8C1F5',
  },
  wisdomBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7E4BCF',
  },
  wisdomTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  wisdomLoading: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  wisdomLoadingText: {
    fontSize: 12,
    color: COLORS.subtext,
  },
  wisdomText: {
    fontSize: 21,
    fontWeight: '800',
    color: '#362713',
    lineHeight: 30,
  },
  swotSection: {
    marginTop: 14,
    marginHorizontal: 20,
    gap: 10,
  },
  swotSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  swotLoadingCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swotLoadingText: {
    color: COLORS.subtext,
    fontSize: 12,
  },
  swotCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#DED4EC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  swotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  swotCardHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  swotCardIcon: {
    fontSize: 18,
  },
  swotCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  swotCardHeadlineDark: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  swotCardSub: {
    marginTop: 4,
    fontSize: 12,
    color: '#5B5B68',
    lineHeight: 18,
  },
  swotCardBody: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#D7CCE8',
    paddingTop: 10,
    gap: 6,
  },
  swotCardHeadline: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  swotCardDetail: {
    fontSize: 12,
    color: COLORS.subtext,
    lineHeight: 18,
  },
  swotCardTip: {
    fontSize: 12,
    color: COLORS.text,
  },
  swotCardBar: {
    marginTop: 10,
    height: 4,
    borderRadius: 999,
  },
});
