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
import { NatalChartResponse, SkyPulseResponse, WeeklySwotResponse, SwotPoint } from '../../services/astrology.service';
import { DailySecret } from '../../services/oracle.service';
import {
  useDailySecret,
  useSkyPulse,
  useWeeklySwot,
  useNatalChart,
} from '../../hooks/useHomeQueries';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { ErrorStateCard, SafeScreen } from '../../components/ui';
import { announceForAccessibility } from '../../utils/accessibility';

const SERVICE_SLIDE_IDS = [
  { id: 'planner', key: 'home.planner', emoji: '📅' },
  { id: 'dream', key: 'home.dreams', emoji: '🌙' },
  { id: 'numerology', key: 'home.numerology', emoji: '🔢' },
  { id: 'weekly', key: 'home.weeklyAnalysis', emoji: '📅' },
  { id: 'natal', key: 'home.birthChart', emoji: '⭐' },
  { id: 'compatibility', key: 'home.compatibility', emoji: '💕' },
  { id: 'name', key: 'home.nameAnalysis', emoji: '🧿' },
];


const DAILY_VIBE_FALLBACKS = [
  'Bugun acele etmeden ilerle; dogru an seni bulacak.',
  'Kucuk bir karar gunun ritmini tamamen degistirebilir.',
  'Sessiz bir an yakala, cevaplar orada netlesecek.',
  'Kalbini hafifleten secenegi sec; gun onunla acilacak.',
];

const RETRO_CAUTION_KEYS: Record<string, string> = {
  'Merkür': 'home.retroMercury', 'Mercury': 'home.retroMercury',
  'Venüs': 'home.retroVenus', 'Venus': 'home.retroVenus',
  'Mars': 'home.retroMars',
  'Jüpiter': 'home.retroJupiter', 'Jupiter': 'home.retroJupiter',
  'Satürn': 'home.retroSaturn', 'Saturn': 'home.retroSaturn',
  'Uranüs': 'home.retroUranus', 'Uranus': 'home.retroUranus',
  'Neptün': 'home.retroNeptune', 'Neptune': 'home.retroNeptune',
  'Plüton': 'home.retroPluto', 'Pluto': 'home.retroPluto',
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

function getSwotItems(colors: ReturnType<typeof useTheme>['colors'], t: (k: string) => string) {
  return [
    { id: 'strength' as const, titleKey: 'home.strength', icon: '⚡', accent: colors.violetLight, surface: colors.primarySoftBg },
    { id: 'opportunity' as const, titleKey: 'home.opportunity', icon: '✨', accent: colors.trine, surface: colors.successLight },
    { id: 'threat' as const, titleKey: 'home.threat', icon: '🚫', accent: colors.error, surface: colors.cautionBg },
    { id: 'weakness' as const, titleKey: 'home.weakness', icon: '⚠️', accent: colors.warning, surface: colors.neutralBg },
  ];
}

const SUMMARY_MAX_CHARS = 90;

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
  const { colors } = useTheme();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const onboardingMaritalStatus = useOnboardingStore((s) => s.maritalStatus);
  const onboardingFocusPoints = useOnboardingStore((s) => s.focusPoints);
  const router = useRouter();
  const dailySecretParams = useMemo(
    () =>
      user
        ? {
            name: user.name ?? (`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined),
            birthDate: user.birthDate ?? undefined,
            maritalStatus: user.maritalStatus ?? onboardingMaritalStatus ?? undefined,
            focusPoint: user.focusPoint?.split(',')[0] ?? onboardingFocusPoints[0] ?? undefined,
          }
        : null,
    [user, onboardingMaritalStatus, onboardingFocusPoints]
  );

  const dailySecretQuery = useDailySecret(dailySecretParams);
  const skyPulseQuery = useSkyPulse();
  const weeklySwotQuery = useWeeklySwot(user?.id);
  const natalChartQuery = useNatalChart(user?.id);

  const dailySecret = dailySecretQuery.data ?? null;
  const secretLoading = dailySecretQuery.isLoading;
  const secretError = dailySecretQuery.isError;
  const skyPulse = skyPulseQuery.data ?? null;
  const skyPulseLoading = skyPulseQuery.isLoading;
  const skyPulseError = skyPulseQuery.isError;
  const weeklySwot = weeklySwotQuery.data ?? null;
  const weeklyLoading = weeklySwotQuery.isLoading;
  const weeklyError = weeklySwotQuery.isError;
  const natalChart = natalChartQuery.data ?? null;

  const loadDailySecret = useCallback(() => dailySecretQuery.refetch(), [dailySecretQuery.refetch]);
  const loadSkyPulse = useCallback(() => skyPulseQuery.refetch(), [skyPulseQuery.refetch]);
  const loadWeeklySwot = useCallback(() => weeklySwotQuery.refetch(), [weeklySwotQuery.refetch]);
  const loadNatalChart = useCallback(() => natalChartQuery.refetch(), [natalChartQuery.refetch]);

  const SERVICE_SLIDES = useMemo(() => SERVICE_SLIDE_IDS.map((s) => ({ ...s, title: t(s.key) })), [t]);
  const sliderRef = useRef<FlatList<(typeof SERVICE_SLIDES)[0]>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const [activeSlide, setActiveSlide] = useState(0);
  const [expandedSwotId, setExpandedSwotId] = useState<string | null>(null);
  const [transitExpanded, setTransitExpanded] = useState(false);
  const [wisdomExpanded, setWisdomExpanded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const swotYRef = useRef(0);

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

  useEffect(() => {
    if (dailySecretQuery.isSuccess && dailySecretQuery.data) {
      announceForAccessibility(t('accessibility.contentLoaded'));
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [dailySecretQuery.isSuccess, dailySecretQuery.data, fadeAnim, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dailySecretQuery.refetch(),
      skyPulseQuery.refetch(),
      weeklySwotQuery.refetch(),
      natalChartQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [
    dailySecretQuery.refetch,
    skyPulseQuery.refetch,
    weeklySwotQuery.refetch,
    natalChartQuery.refetch,
  ]);

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
    const hasCriticalRetro = retrogrades.some((p: string) => p.includes('Merkür') || p.includes('Mars'));
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
      for (const [key, tKey] of Object.entries(RETRO_CAUTION_KEYS)) {
        if (planet.includes(key)) { cautionItems.push(t(tKey)); break; }
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
    t,
    aiInsightLines,
    dailyVibeText,
    focusKey,
    natalChart,
    skyPulse?.moonSignTurkish,
    skyPulse?.retrogradePlanets,
    skyPulse?.moonPhase,
  ]);

  const S = makeStyles(colors);
  const swotDataMap: Record<string, SwotPoint | undefined> = {
    strength: weeklySwot?.strength,
    weakness: weeklySwot?.weakness,
    opportunity: weeklySwot?.opportunity,
    threat: weeklySwot?.threat,
  };

  const handleServiceSlidePress = useCallback((itemId: string) => {
    if (itemId === 'planner') router.push('/(tabs)/calendar');
    else if (itemId === 'dream') router.push('/(tabs)/dreams');
    else if (itemId === 'natal') router.push('/(tabs)/natal-chart');
    else if (itemId === 'numerology') router.push('/numerology');
    else if (itemId === 'name') router.push('/name-analysis');
    else if (itemId === 'compatibility') router.push('/(tabs)/compatibility');
    else if (itemId === 'weekly') scrollViewRef.current?.scrollTo({ y: swotYRef.current, animated: true });
  }, []);

  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <View style={S.container}>
        <OnboardingBackground />

        <ScrollView
        ref={scrollViewRef}
        style={S.scroll}
        contentContainerStyle={S.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={S.headerRow}>
          <TouchableOpacity
            style={S.profileBlock}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.7}
            accessibilityLabel={t('home.profileBlock')}
            accessibilityRole="button"
          >
            <View style={S.avatar}>
              <Ionicons name="person" size={16} color={colors.subtext} />
            </View>
            <View>
              <Text style={S.profileTitle}>{t('home.profileTitle')}</Text>
              <Text style={S.profileSubtitle}>LV. 2 (%15)</Text>
            </View>
          </TouchableOpacity>
          <View style={S.headerIcons}>
            <TouchableOpacity
              style={S.iconButton}
              onPress={() => router.push('/premium')}
              accessibilityLabel={t('home.features')}
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="sparkles" size={18} color={colors.subtext} />
            </TouchableOpacity>
            <TouchableOpacity
              style={S.iconButton}
              onPress={() => router.push('/notifications-settings')}
              accessibilityLabel={t('home.notifications')}
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="notifications" size={18} color={colors.subtext} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={S.greetingText}>{t('home.greetingFull', { name: fullName })}</Text>

        <View style={S.transitSection}>
          <Text style={S.transitSectionTitle}>{t('home.transitTitle')}</Text>
          <View style={S.transitCard}>
            {/* Başlık */}
            <View style={S.transitHeadlineRow}>
              <View style={[
                S.transitDot,
                {
                  backgroundColor:
                    transitDigest.energyType === 'lucky' ? colors.success
                    : transitDigest.energyType === 'caution' ? colors.red
                    : colors.warning,
                },
              ]} />
              <Text style={S.transitHeadline}>{transitDigest.title}</Text>
            </View>

            {/* Gezegen Enerji Bandı */}
            <View style={[
              S.energyBand,
              {
                backgroundColor:
                  transitDigest.energyType === 'lucky' ? colors.luckBg
                  : transitDigest.energyType === 'caution' ? colors.cautionBg
                  : colors.neutralBg,
              },
            ]}>
              <Text style={S.energyBandIcon}>
                {transitDigest.energyType === 'lucky' ? '🟢' : transitDigest.energyType === 'caution' ? '🔴' : '🟡'}
              </Text>
              <Text style={[
                S.energyBandText,
                {
                  color:
                    transitDigest.energyType === 'lucky' ? colors.success
                    : transitDigest.energyType === 'caution' ? colors.cautionTextDark
                    : colors.warning,
                },
              ]}>
                {transitDigest.energyLabel}
              </Text>
            </View>

            {/* Özet-detay pattern: Günün Enerjisi, Yapabilecekler, Dikkat Noktaları */}
            {transitExpanded ? (
              <>
                <Text style={S.transitDailyLabel}>{t('home.transitDailyEnergy')}</Text>
                <Text style={S.transitDailyText}>{dailyVibeText}</Text>
                {transitDigest.actionItems.length > 0 && (
                  <View style={S.transitDetailBox}>
                    <Text style={S.transitBoxLabel}>⚡ {t('home.transitActionItems')}</Text>
                    {transitDigest.actionItems.map((line) => (
                      <View key={line} style={S.transitPointRow}>
                        <Text style={S.transitPointMark}>›</Text>
                        <Text style={S.transitPointText}>{line}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {transitDigest.cautionItems.length > 0 && (
                  <View style={[S.transitDetailBox, S.transitCautionBox]}>
                    <Text style={[S.transitBoxLabel, { color: colors.cautionText }]}>⚠️ {t('home.transitCautionItems')}</Text>
                    {transitDigest.cautionItems.map((line) => (
                      <View key={line} style={S.transitPointRow}>
                        <Text style={[S.transitPointMark, { color: colors.cautionText }]}>›</Text>
                        <Text style={[S.transitPointText, { color: colors.cautionTextDark }]}>{line}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => setTransitExpanded(false)}
                  style={S.detailCta}
                  accessibilityLabel={t('home.hideDetails')}
                  accessibilityRole="button"
                  accessibilityHint={t('accessibility.collapseHint')}
                  accessibilityState={{ expanded: true }}
                >
                  <Text style={S.detailCtaText} maxFontSizeMultiplier={2}>{t('home.hideDetails')}</Text>
                  <Ionicons name="chevron-up" size={16} color={colors.primary} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => setTransitExpanded(true)}
                style={S.detailCta}
                accessibilityLabel={t('home.showDetails')}
                accessibilityRole="button"
                accessibilityHint={t('accessibility.expandHint')}
                accessibilityState={{ expanded: false }}
              >
                <Text style={S.detailCtaText} maxFontSizeMultiplier={2}>{t('home.showDetails')}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Animated.FlatList
          ref={sliderRef}
          data={SERVICE_SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          snapToInterval={SLIDE_SNAP}
          snapToAlignment="start"
          decelerationRate="fast"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          onMomentumScrollEnd={handleSliderScrollEnd}
          contentContainerStyle={S.sliderContainer}
          renderItem={({ item, index }) => {
            const inputRange = [
              (index - 1) * SLIDE_SNAP,
              index * SLIDE_SNAP,
              (index + 1) * SLIDE_SNAP,
            ];
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.9, 1, 0.9],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.65, 1, 0.65],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                style={[S.sliderCardWrapper, { transform: [{ scale }], opacity }]}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleServiceSlidePress(item.id)}
                  style={S.sliderCard}
                  accessibilityLabel={item.title}
                  accessibilityRole="button"
                >
                  <Text style={S.sliderEmoji}>{item.emoji}</Text>
                  <Text style={S.sliderText}>{item.title}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          }}
        />

        <View style={S.sliderDots}>
          {SERVICE_SLIDES.map((item, index) => (
            <View key={item.id} style={[S.dot, index === activeSlide && S.dotActive]} />
          ))}
        </View>

        <View style={S.wisdomCard}>
          <View style={S.wisdomHeader}>
            <Ionicons name="eye" size={16} color={colors.primary} />
            <Text style={S.wisdomTitle}>{t('home.dailySecret')}</Text>
            <View style={S.wisdomBadge}>
              <Text style={S.wisdomBadgeText}>{t('home.personalMessage')}</Text>
            </View>
          </View>

          {secretLoading ? (
            <View style={S.wisdomLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={S.wisdomLoadingText}>{t('home.secretLoading')}</Text>
            </View>
          ) : secretError ? (
            <ErrorStateCard
              message={t('home.secretError')}
              onRetry={loadDailySecret}
              accessibilityLabel="Günün sırrını tekrar yükle"
            />
          ) : (
            <Animated.View
              style={{ opacity: fadeAnim }}
              accessibilityLiveRegion="polite"
              accessibilityLabel={t('home.dailySecret')}
            >
              <Text style={S.wisdomText} maxFontSizeMultiplier={2}>
                {wisdomExpanded || secretText.length <= SUMMARY_MAX_CHARS
                  ? secretText
                  : `${secretText.slice(0, SUMMARY_MAX_CHARS).trim()}...`}
              </Text>
              {secretText.length > SUMMARY_MAX_CHARS && (
                <TouchableOpacity
                  onPress={() => setWisdomExpanded((e) => !e)}
                  style={S.detailCta}
                  accessibilityLabel={wisdomExpanded ? t('home.hideDetails') : t('home.showDetails')}
                  accessibilityRole="button"
                  accessibilityHint={wisdomExpanded ? t('accessibility.collapseHint') : t('accessibility.expandHint')}
                  accessibilityState={{ expanded: wisdomExpanded }}
                >
                  <Text style={S.detailCtaText} maxFontSizeMultiplier={2}>
                    {wisdomExpanded ? t('home.hideDetails') : t('home.showDetails')}
                  </Text>
                  <Ionicons name={wisdomExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </Animated.View>
          )}
        </View>

        {skyPulseLoading ? (
          <View style={[S.skyPulseCard, S.skyPulseCenter]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={S.skyPulseLoadingText}>{t('home.skyPulseLoading')}</Text>
          </View>
        ) : skyPulseError || !skyPulse ? (
          <View style={[S.skyPulseCard, S.skyPulseCenter]}>
            <ErrorStateCard
              message={t('home.skyPulseError')}
              onRetry={loadSkyPulse}
              variant="compact"
              accessibilityLabel={t('home.skyPulseRetry')}
            />
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/calendar')}
            style={S.skyPulseCard}
            accessibilityLabel="Takvim ve ay fazı detayları"
            accessibilityRole="button"
            accessibilityHint={t('accessibility.doubleTapToActivate')}
          >
            <View style={S.skyPulseLeft}>
              <Animated.Text
                style={[
                  S.skyPulseMoonIcon,
                  {
                    opacity: moonGlow.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
                    transform: [{ scale: moonGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
                  },
                ]}
              >
                {getMoonPhaseIcon(skyPulse.moonPhase)}
              </Animated.Text>
            </View>
            <View style={S.skyPulseRight}>
              <Text style={S.skyPulseSign}>
                {skyPulse.moonSignSymbol} {skyPulse.moonSignTurkish}
              </Text>
              <Text style={S.skyPulsePhase}>{skyPulse.moonPhase}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} style={{ opacity: 0.6 }} />
          </TouchableOpacity>
        )}

        {/* Collective Dream Pulse Widget */}
        <CollectivePulseWidget onPress={() => router.push('/(tabs)/dreams')} />

        <ServiceStatus />

        <View
          style={S.swotSection}
          onLayout={(e) => { swotYRef.current = e.nativeEvent.layout.y; }}
        >
          <Text style={S.swotSectionTitle}>{t('home.swotSectionTitle')}</Text>

          {weeklyLoading ? (
            <View style={S.swotLoadingCard}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={S.swotLoadingText}>{t('home.swotLoading')}</Text>
            </View>
          ) : weeklyError || !weeklySwot ? (
            <View style={S.swotLoadingCard}>
              <ErrorStateCard
                message={t('home.swotError')}
                onRetry={loadWeeklySwot}
                variant="compact"
                accessibilityLabel={t('home.swotRetry')}
              />
            </View>
          ) : (
            getSwotItems(colors, t).map((item) => {
              const swotPoint = swotDataMap[item.id];
              const isExpanded = expandedSwotId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[S.swotCard, { backgroundColor: item.surface, borderColor: `${item.accent}55` }]}
                  activeOpacity={0.85}
                  onPress={() => setExpandedSwotId((prev) => (prev === item.id ? null : item.id))}
                  accessibilityLabel={`${t(item.titleKey)}: ${isExpanded ? t('common.collapse') : t('common.expand')}`}
                  accessibilityRole="button"
                  accessibilityHint={isExpanded ? t('accessibility.collapseHint') : t('accessibility.expandHint')}
                  accessibilityState={{ expanded: isExpanded }}
                >
                  <View style={S.swotCardHeader}>
                    <View style={S.swotCardHeadLeft}>
                      <Text style={S.swotCardIcon}>{item.icon}</Text>
                      <Text style={[S.swotCardTitle, { color: item.accent }]}>{t(item.titleKey)}</Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={item.accent}
                    />
                  </View>

                  <Text style={S.swotCardHeadlineDark}>{swotPoint?.headline ?? t('home.areaActiveThisWeek')}</Text>
                  <Text style={S.swotCardSub}>
                    {swotPoint?.subtext ?? (isExpanded ? t('home.hideDetails') : t('home.showDetails'))}
                  </Text>

                  {isExpanded && swotPoint && (
                    <View style={S.swotCardBody}>
                      <Text style={S.swotCardTip}>{t('home.tipsLabel')}: {swotPoint.quickTip}</Text>
                    </View>
                  )}
                  <View style={[S.swotCardBar, { backgroundColor: item.accent }]} />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
    </SafeScreen>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
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
    backgroundColor: C.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  profileSubtitle: {
    fontSize: 12,
    color: C.subtext,
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
    backgroundColor: C.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingText: {
    marginHorizontal: 20,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  skyPulseCard: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: C.surfaceGlass,
    borderWidth: 1,
    borderColor: C.surfaceGlassBorder,
    gap: 12,
  },
  skyPulseLeft: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primaryTint,
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
    color: C.text,
  },
  skyPulsePhase: {
    fontSize: 11,
    color: C.subtext,
    fontStyle: 'italic',
  },
  skyPulseCenter: {
    justifyContent: 'center',
  },
  skyPulseLoadingText: {
    fontSize: 12,
    color: C.subtext,
    fontStyle: 'italic',
  },
  sliderContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    marginTop: 12,
  },
  sliderCardWrapper: {
    width: SLIDE_WIDTH,
    marginRight: SLIDE_GAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderCard: {
    width: SLIDE_WIDTH,
    height: 50,
    backgroundColor: C.accent,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.accent,
    shadowColor: C.accent,
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
    color: C.white,
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
    backgroundColor: C.border,
  },
  dotActive: {
    backgroundColor: C.primary,
    width: 14,
  },
  transitSection: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  transitSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.subtext,
    marginBottom: 8,
  },
  transitCard: {
    backgroundColor: C.primarySoftBg,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: C.primary,
    shadowColor: C.primary,
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
    color: C.success,
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
    color: C.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  transitDailyText: {
    fontSize: 14,
    lineHeight: 20,
    color: C.text,
    marginBottom: 10,
  },
  transitDetailBox: {
    backgroundColor: C.primarySoftBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.primary,
    gap: 6,
    marginBottom: 8,
  },
  transitCautionBox: {
    backgroundColor: C.cautionBg,
    borderColor: C.error,
  },
  transitBoxLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary700,
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
    color: C.primary700,
    fontWeight: '700',
  },
  transitPointText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: C.text,
  },
  detailCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  detailCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
  },
  wisdomCard: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: C.neutralBg,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: C.warning,
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
    backgroundColor: C.primarySoftBg,
    borderWidth: 1,
    borderColor: C.primary,
  },
  wisdomBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.primary,
  },
  wisdomTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  wisdomLoading: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  wisdomLoadingText: {
    fontSize: 12,
    color: C.subtext,
  },
  wisdomText: {
    fontSize: 21,
    fontWeight: '800',
    color: C.text,
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
    color: C.primary,
  },
  swotLoadingCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swotLoadingText: {
    color: C.subtext,
    fontSize: 12,
  },
  swotCard: {
    backgroundColor: C.surface,
    borderWidth: 1.2,
    borderColor: C.border,
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
    color: C.text,
  },
  swotCardHeadlineDark: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: C.text,
  },
  swotCardSub: {
    marginTop: 4,
    fontSize: 12,
    color: C.subtext,
    lineHeight: 18,
  },
  swotCardBody: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
    gap: 6,
  },
  swotCardHeadline: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  swotCardDetail: {
    fontSize: 12,
    color: C.subtext,
    lineHeight: 18,
  },
  swotCardTip: {
    fontSize: 12,
    color: C.text,
  },
  swotCardBar: {
    marginTop: 10,
    height: 4,
    borderRadius: 999,
  },
});
}
