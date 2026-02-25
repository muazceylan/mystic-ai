import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  Dimensions,
  findNodeHandle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Reanimated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  Plus,
  Users,
  Pencil,
  Scale,
  MapPin,
  Calendar,
  Clock3,
  Search,
  Check,
  X,
  Sparkles,
} from 'lucide-react-native';
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  ScaleDecorator,
  type RenderItemParams as DraggableRenderItemParams,
} from 'react-native-draggable-flatlist';
import { useAuthStore } from '../../store/useAuthStore';
import { useNatalChartStore } from '../../store/useNatalChartStore';
import {
  useCompanionStore,
  isSavedPersonProfile,
  type Profile,
  type SavedPerson,
} from '../../store/useCompanionStore';
import { useSynastryStore } from '../../store/useSynastryStore';
import { useNightSkyPosterStore } from '../../store/useNightSkyPosterStore';
import { useNatalVisualsStore } from '../../store/useNatalVisualsStore';
import {
  NatalChartResponse,
  HousePlacement,
  PlanetPosition,
  PlanetaryAspect,
  fetchLatestNatalChart,
  calculateNatalChart,
} from '../../services/astrology.service';
import type { RelationshipType, SavedPersonRequest } from '../../services/synastry.service';
import {
  getGooglePlaceSelection,
  isGooglePlacesConfigured,
  searchGooglePlaceSuggestions,
  type GooglePlaceSuggestion,
} from '../../services/googlePlaces.service';
import { CITIES, COUNTRIES, DISTRICTS } from '../../constants';
import { getZodiacInfo } from '../../constants/zodiac';
import { HOUSE_GLOSSARY } from '../../constants/astrology-glossary';
import { formatAspectAngleHuman, labelAspectType } from '../../constants/astroLabelMap';
import PlanetBottomSheet from '../../components/Astrology/PlanetBottomSheet';
import HouseBottomSheet from '../../components/Astrology/HouseBottomSheet';
import BigThreeBottomSheet from '../../components/Astrology/BigThreeBottomSheet';
import CosmicHotspotCard from '../../components/Astrology/CosmicHotspotCard';
import AspectBottomSheet from '../../components/Astrology/AspectBottomSheet';
import StructuredNatalAiInterpretation from '../../components/Astrology/StructuredNatalAiInterpretation';
import NatalChartProPanels from '../../components/Astrology/NatalChartProPanels';
import NatalChartHeroCard, {
  type HeroBigThreeRole,
  type HeroMetricTarget,
} from '../../components/Astrology/NatalChartHeroCard';
import BirthNightSkyPoster from '../../components/Astrology/BirthNightSkyPoster';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { AccordionSection, SafeScreen } from '../../components/ui';
import MatchResultScreen from '../../screens/match/MatchResultScreen';
import SynastryProPanel from '../../components/Astrology/SynastryProPanel';

// ─── Planet Symbols (Unicode astro glyphs) ──────────────────────────────
const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
};


const ZODIAC_SYMBOLS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const NIGHT_SKY_POSTER_LINK = 'https://mysticai.app/dl?utm_source=night_sky_poster';
// Safe mode: keep DnD disabled to protect main scroll stability across devices.
const ENABLE_SECTION_DND = false;

type ScreenState = 'loading' | 'calculating' | 'error' | 'ready';
type ProfileMode = 'switch' | 'compare';
type PickerTarget = 'date' | 'time';
type LocationPickerTarget = 'country' | 'city' | 'district';
type BigThreeRole = 'sun' | 'moon' | 'rising';
type NatalAccordionKey =
  | 'night_poster'
  | 'profile_summary'
  | 'big_three'
  | 'hotspots'
  | 'natal_chart_visual'
  | 'aspect_matrix_table'
  | 'cosmic_position_details'
  | 'cosmic_balance'
  | 'planet_positions'
  | 'aspect_list'
  | 'house_positions'
  | 'ai_interpretation';
type DraggableNatalSectionKey = Exclude<NatalAccordionKey, 'profile_summary'>;

type CompanionFormState = {
  name: string;
  relationshipType: RelationshipType;
  gender?: string;
  birthDateValue: Date | null;
  birthTimeValue: Date | null;
  birthLocation: string;
  countryCode?: string;
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
};

type EditableCompanion = SavedPerson | null;

const RELATIONSHIP_OPTIONS: Array<{ key: RelationshipType; label: string }> = [
  { key: 'FRIENDSHIP', label: 'Arkadaş' },
  { key: 'LOVE', label: 'Partner' },
  { key: 'FAMILY', label: 'Aile' },
  { key: 'RIVAL', label: 'Rakip' },
  { key: 'BUSINESS', label: 'İş' },
];

const GENDER_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'WOMAN', label: 'Kadın' },
  { key: 'MAN', label: 'Erkek' },
  { key: 'NON_BINARY', label: 'Non-binary' },
  { key: 'OTHER', label: 'Diğer' },
];

const NATAL_SECTION_ORDER_STORAGE_KEY = 'natal_chart_section_order_v2';
const DEFAULT_NATAL_SECTION_ORDER: DraggableNatalSectionKey[] = [
  'big_three',
  'hotspots',
  'natal_chart_visual',
  'aspect_matrix_table',
  'cosmic_position_details',
  'cosmic_balance',
  'planet_positions',
  'aspect_list',
  'house_positions',
  'ai_interpretation',
  'night_poster',
];

function normalizeDraggableSectionOrder(input: unknown): DraggableNatalSectionKey[] {
  const valid = new Set<DraggableNatalSectionKey>(DEFAULT_NATAL_SECTION_ORDER);
  const seen = new Set<DraggableNatalSectionKey>();
  const ordered: DraggableNatalSectionKey[] = [];

  if (Array.isArray(input)) {
    input.forEach((v) => {
      if (typeof v !== 'string') return;
      const key = v as DraggableNatalSectionKey;
      if (!valid.has(key) || seen.has(key)) return;
      seen.add(key);
      ordered.push(key);
    });
  }

  DEFAULT_NATAL_SECTION_ORDER.forEach((key) => {
    if (seen.has(key)) return;
    ordered.push(key);
  });

  return ordered;
}

function normalizeTrKey(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function dedupeByNormalizedText<T>(items: T[], getValue: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const raw = getValue(item);
    const key = normalizeTrKey(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function profileKey(profile: Profile | null | undefined, fallbackUserId?: number) {
  if (!profile) return null;
  if (isSavedPersonProfile(profile)) return `saved:${profile.id}`;
  return `user:${profile.id ?? fallbackUserId ?? 'self'}`;
}

function sameProfile(a: Profile | null | undefined, b: Profile | null | undefined, fallbackUserId?: number) {
  return profileKey(a, fallbackUserId) === profileKey(b, fallbackUserId);
}

function getProfileName(profile: Profile | null | undefined) {
  if (!profile) return '';
  if (isSavedPersonProfile(profile)) return profile.name;
  return profile.name || [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username || 'Ben';
}

function getProfileBirthSummary(profile: Profile | null | undefined, chart: NatalChartResponse | null, t: (k: string) => string) {
  if (!profile) return '';
  if (isSavedPersonProfile(profile)) {
    return `${profile.birthDate} | ${profile.birthTime ?? t('birthInfo.timeUnknown')} | ${profile.birthLocation}`;
  }
  if (!chart) return '';
  return `${chart.birthDate} | ${chart.birthTime ?? t('birthInfo.timeUnknown')} | ${chart.birthLocation}`;
}

function getAvatarInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '•';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function canonicalPairKey(values: Array<string | null | undefined>) {
  const keys = values.filter((v): v is string => Boolean(v));
  if (keys.length !== 2) return null;
  return [...keys].sort().join('|');
}

function createEmptyCompanionForm(): CompanionFormState {
  return {
    name: '',
    relationshipType: 'FRIENDSHIP',
    gender: undefined,
    birthDateValue: null,
    birthTimeValue: null,
    birthLocation: '',
    countryCode: 'TR',
  };
}

function parseDateInput(value?: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function parseTimeInput(value?: string | null): Date | null {
  if (!value) return null;
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
}

function formatDateForApi(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTimeForApi(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
}

function formatDateForDisplay(date: Date | null, locale: string) {
  if (!date) return 'Tarih Seç';
  try {
    return new Intl.DateTimeFormat(locale?.startsWith('tr') ? 'tr-TR' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return formatDateForApi(date);
  }
}

function formatTimeForDisplay(date: Date | null, locale: string) {
  if (!date) return 'Saat Seç';
  try {
    return new Intl.DateTimeFormat(locale?.startsWith('tr') ? 'tr-TR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
}

function createCompanionFormFromPerson(person: SavedPerson): CompanionFormState {
  const locationParts = person.birthLocation
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const countryMatch = COUNTRIES.find((country) =>
    locationParts.some((part) => part.toLowerCase() === country.name.toLowerCase() || part.toUpperCase() === country.code),
  );
  const countryCode = countryMatch?.code ?? 'TR';
  const cityCatalog = (CITIES[countryCode] ?? CITIES.default ?? []).map((c) => c.name);
  const city = locationParts.find((part) => cityCatalog.some((name) => name.toLowerCase() === part.toLowerCase()));
  const district = city
    ? locationParts.find(
        (part) =>
          part.toLowerCase() !== city.toLowerCase() &&
          (DISTRICTS[city] ?? []).some((d) => d.toLowerCase() === part.toLowerCase()),
      )
    : undefined;

  return {
    name: person.name,
    relationshipType: person.relationshipType ?? 'FRIENDSHIP',
    gender: person.gender ?? undefined,
    birthDateValue: parseDateInput(person.birthDate),
    birthTimeValue: parseTimeInput(person.birthTime ? person.birthTime.slice(0, 5) : null),
    birthLocation: person.birthLocation,
    countryCode,
    city,
    district,
    latitude: person.lat,
    longitude: person.lng,
    timezone: person.timezone ?? undefined,
  };
}

function getCountryNameByCode(code?: string) {
  if (!code) return '';
  return COUNTRIES.find((country) => country.code === code)?.name ?? code;
}

function composeFallbackBirthLocation(form: CompanionFormState) {
  const countryName = getCountryNameByCode(form.countryCode);
  const parts = [form.district, form.city, countryName].filter(Boolean);
  return parts.join(', ');
}

function relationshipLabel(type: RelationshipType | null | undefined) {
  return RELATIONSHIP_OPTIONS.find((o) => o.key === type)?.label ?? 'Arkadaş';
}

function genderLabel(gender?: string | null) {
  if (!gender) return '';
  return GENDER_OPTIONS.find((o) => o.key === gender)?.label ?? gender;
}

function savedPersonToChart(person: SavedPerson): NatalChartResponse {
  return {
    id: person.id,
    userId: person.userId,
    name: person.name,
    birthDate: person.birthDate,
    birthTime: person.birthTime,
    birthLocation: person.birthLocation,
    latitude: person.lat,
    longitude: person.lng,
    sunSign: person.sunSign,
    moonSign: person.moonSign,
    risingSign: person.risingSign,
    planets: person.planets as any,
    houses: person.houses as any,
    aspects: person.aspects as any,
    aiInterpretation: null,
    interpretationStatus: null,
    calculatedAt: person.createdAt,
  };
}

function getAspectInfo(C: ReturnType<typeof useTheme>['colors'], t: (k: string) => string) {
  return {
    CONJUNCTION: { symbol: '☌', label: t('natalChart.conjunction'), color: C.violet },
    OPPOSITION: { symbol: '☍', label: t('natalChart.opposition'), color: C.redBright },
    TRINE: { symbol: '△', label: t('natalChart.trine'), color: C.trine },
    SQUARE: { symbol: '□', label: t('natalChart.square'), color: C.amber },
  } as Record<string, { symbol: string; label: string; color: string }>;
}

export default function NatalChartTab() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const ASPECT_INFO = useMemo(() => getAspectInfo(colors, t), [colors, t]);
  const planetNames: Record<string, string> = useMemo(() => ({
    Sun: t('natalChart.sun'),
    Moon: t('natalChart.moon'),
    Mercury: t('natalChart.mercury'),
    Venus: t('natalChart.venus'),
    Mars: t('natalChart.mars'),
    Jupiter: t('natalChart.jupiter'),
    Saturn: t('natalChart.saturn'),
    Uranus: t('natalChart.uranus'),
    Neptune: t('natalChart.neptune'),
    Pluto: t('natalChart.pluto'),
    Chiron: t('natalChart.chiron'),
    NorthNode: t('natalChart.northNode'),
  }), [t]);
  const user = useAuthStore((s) => s.user);
  const setNightSkyPosterDraft = useNightSkyPosterStore((s) => s.setDraft);
  const setNatalVisualsDraft = useNatalVisualsStore((s) => s.setDraft);
  const {
    savedPeople,
    activeProfile,
    selectedForComparison,
    setActiveProfile,
    toggleComparisonProfile,
    clearComparisonSelection,
    syncSavedPeople,
    savePerson,
    deletePerson,
  } = useCompanionStore();
  const {
    currentSynastry,
    isAnalyzing: isAnalyzingSynastry,
    pollSynastry,
    clearSynastry,
  } = useSynastryStore();
  const {
    chart: cachedChart,
    setChart: setCachedChart,
    setLoading: setCacheLoading,
    setError: setCacheError,
    isStale,
  } = useNatalChartStore();

  const [state, setState] = useState<ScreenState>(cachedChart ? 'ready' : 'loading');
  const [chart, setChart] = useState<NatalChartResponse | null>(cachedChart);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetPosition | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState<HousePlacement | null>(null);
  const [houseSheetVisible, setHouseSheetVisible] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState<PlanetaryAspect | null>(null);
  const [aspectSheetVisible, setAspectSheetVisible] = useState(false);
  const [selectedBigThreeRole, setSelectedBigThreeRole] = useState<BigThreeRole | null>(null);
  const [bigThreeSheetVisible, setBigThreeSheetVisible] = useState(false);
  const [heroInfoExpanded, setHeroInfoExpanded] = useState(false);
  const [profileSwitcherVisible, setProfileSwitcherVisible] = useState(true);
  const [openAccordionKey, setOpenAccordionKey] = useState<NatalAccordionKey | null>(null);
  const [sectionOrder, setSectionOrder] = useState<DraggableNatalSectionKey[]>(DEFAULT_NATAL_SECTION_ORDER);
  const [profileMode, setProfileMode] = useState<ProfileMode>('switch');
  const [companionModalVisible, setCompanionModalVisible] = useState(false);
  const [editingCompanion, setEditingCompanion] = useState<EditableCompanion>(null);
  const [companionForm, setCompanionForm] = useState<CompanionFormState>(createEmptyCompanionForm);
  const [companionSaving, setCompanionSaving] = useState(false);
  const [iosPickerTarget, setIosPickerTarget] = useState<PickerTarget | null>(null);
  const [iosPickerDraftDate, setIosPickerDraftDate] = useState<Date>(new Date());
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<GooglePlaceSuggestion[]>([]);
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const [placeSelecting, setPlaceSelecting] = useState(false);
  const [placesSessionToken] = useState(() => `places-${Date.now()}-${Math.round(Math.random() * 100000)}`);
  const [locationPickerTarget, setLocationPickerTarget] = useState<LocationPickerTarget | null>(null);
  const [locationPickerQuery, setLocationPickerQuery] = useState('');
  const [companionFormViewportHeight, setCompanionFormViewportHeight] = useState(0);
  const companionFormScrollRef = useRef<ScrollView | null>(null);
  const locationPickerInlineYRef = useRef(0);
  const pendingLocationPickerScrollRef = useRef(false);

  const googlePlacesAvailable = isGooglePlacesConfigured();
  const companionUseGooglePlaces = false && googlePlacesAvailable;

  const resolvedActiveProfile = useMemo<Profile | null>(() => {
    if (activeProfile) return activeProfile;
    return user ?? null;
  }, [activeProfile, user]);
  const activeProfileIsSaved = isSavedPersonProfile(resolvedActiveProfile);

  // ─── AI Interpretation Polling ─────────────────────────────────────
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);
  const accordionLayoutsRef = useRef<Partial<Record<NatalAccordionKey, { y: number; height: number }>>>({});
  const accordionItemRefsRef = useRef<Partial<Record<NatalAccordionKey, any>>>({});
  const accordionListBaseYRef = useRef(0);
  const lastKnownScrollYRef = useRef(0);
  const accordionFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionJumpTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const mainScrollRef = useRef<any>(null);
  const manualAccordionControlRef = useRef(false);
  const autoAccordionFocusEnabledRef = useRef(false);
  const sectionOrderHydratedRef = useRef(false);
  const [stickyHeroHeight, setStickyHeroHeight] = useState(0);
  const [mainScrollViewportHeight, setMainScrollViewportHeight] = useState(0);
  const [pollExhausted, setPollExhausted] = useState(false);
  const MAX_POLL_ATTEMPTS = 12;
  const POLL_INTERVAL_MS = 3000;

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    pollCountRef.current = 0;
  }, []);

  const startPolling = useCallback(() => {
    if (activeProfileIsSaved) return;
    stopPolling();
    setPollExhausted(false);

    const poll = async () => {
      if (!user?.id || activeProfileIsSaved || pollCountRef.current >= MAX_POLL_ATTEMPTS) {
        stopPolling();
        setPollExhausted(true);
        return;
      }

      pollCountRef.current += 1;

      try {
        const response = await fetchLatestNatalChart(user.id);
        const updated = response.data;
        if (
          updated.interpretationStatus === 'COMPLETED' ||
          updated.interpretationStatus === 'FAILED'
        ) {
          setChart(updated);
          setCachedChart(updated);
          stopPolling();
          return;
        }
      } catch {
        // ignore poll errors
      }

      pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    };

    pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
  }, [user, stopPolling, activeProfileIsSaved]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  useEffect(() => {
    return () => {
      if (accordionFocusTimerRef.current) {
        clearTimeout(accordionFocusTimerRef.current);
        accordionFocusTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(NATAL_SECTION_ORDER_STORAGE_KEY)
      .then((raw) => {
        if (!alive) return;
        if (!raw) {
          sectionOrderHydratedRef.current = true;
          return;
        }
        try {
          const parsed = JSON.parse(raw);
          setSectionOrder(normalizeDraggableSectionOrder(parsed));
        } catch {
          setSectionOrder(DEFAULT_NATAL_SECTION_ORDER);
        }
        sectionOrderHydratedRef.current = true;
      })
      .catch(() => {
        // ignore storage read failures
        sectionOrderHydratedRef.current = true;
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!sectionOrderHydratedRef.current) return;
    AsyncStorage.setItem(NATAL_SECTION_ORDER_STORAGE_KEY, JSON.stringify(sectionOrder)).catch(() => {
      // ignore storage write failures
    });
  }, [sectionOrder]);

  // ─── Skeleton Pulse ────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const pulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    pulseAnimRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    pulseAnimRef.current.start();
    return () => { pulseAnimRef.current?.stop(); };
  }, []);

  // ─── Calculating Animation ─────────────────────────────────────────
  const calcAnim = useRef(new Animated.Value(0)).current;
  const calcAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const startCalcAnimation = () => {
    calcAnimRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(calcAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(calcAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    calcAnimRef.current.start();
  };

  const stopCalcAnimation = () => {
    calcAnimRef.current?.stop();
    calcAnim.setValue(0);
  };

  // ─── Data Loading ──────────────────────────────────────────────────
  const buildRequest = useCallback(() => {
    if (!user?.id || !user?.birthDate) return null;
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined;
    const birthLocation = [user.birthCity, user.birthCountry].filter(Boolean).join(', ');
    if (!birthLocation) return null;

    return {
      userId: user.id,
      name,
      birthDate: user.birthDate,
      birthTime: user.birthTimeUnknown ? undefined : (user.birthTime ?? undefined),
      birthLocation,
      timezone: user.timezone ?? undefined,
      latitude: user.latitude ?? user.lat,
      longitude: user.longitude ?? user.lng,
    };
  }, [user]);

  const loadChart = useCallback(async (forceRefresh = false) => {
    if (activeProfileIsSaved && resolvedActiveProfile) {
      stopPolling();
      setPollExhausted(false);
      setErrorMessage('');
      setChart(savedPersonToChart(resolvedActiveProfile));
      setState('ready');
      return;
    }

    if (!user?.id) {
      setErrorMessage('Kullanici bilgisi bulunamadi. Lutfen tekrar giris yapin.');
      setState('error');
      return;
    }

    if (!forceRefresh && cachedChart && !isStale()) {
      setChart(cachedChart);
      setState('ready');
      return;
    }

    try {
      setState('loading');
      setCacheLoading(true);
      const response = await fetchLatestNatalChart(user.id);
      setChart(response.data);
      setCachedChart(response.data);
      setState('ready');
    } catch {
      const request = buildRequest();
      if (!request) {
        setErrorMessage('Dogum bilgileriniz eksik. Lutfen profilinizi guncelleyin.');
        setState('error');
        setCacheError(t('natalChart.missingBirthData'));
        return;
      }

      try {
        setState('calculating');
        startCalcAnimation();
        const response = await calculateNatalChart(request);
        stopCalcAnimation();
        setChart(response.data);
        setCachedChart(response.data);
        setState('ready');
      } catch {
        stopCalcAnimation();
        setErrorMessage('Dogum haritasi hesaplanamadi. Lutfen tekrar deneyin.');
        setState('error');
        setCacheError(t('natalChart.calcError'));
      }
    } finally {
      setCacheLoading(false);
    }
  }, [user, cachedChart, isStale, buildRequest, activeProfileIsSaved, resolvedActiveProfile, stopPolling]);

  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    setPollExhausted(false);
    try {
      if (activeProfileIsSaved && resolvedActiveProfile) {
        await syncSavedPeople(user.id);
        const latest = useCompanionStore.getState().savedPeople.find((p) => p.id === resolvedActiveProfile.id);
        if (latest) {
          setChart(savedPersonToChart(latest));
          if (sameProfile(resolvedActiveProfile, useCompanionStore.getState().activeProfile, user.id)) {
            setActiveProfile(latest);
          }
        }
        return;
      }
      const response = await fetchLatestNatalChart(user.id);
      setChart(response.data);
      setCachedChart(response.data);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [user, activeProfileIsSaved, resolvedActiveProfile, syncSavedPeople, setActiveProfile]);

  useEffect(() => {
    if (!resolvedActiveProfile && user) {
      setActiveProfile(user);
      return;
    }
    loadChart();
  }, [loadChart, resolvedActiveProfile, user, setActiveProfile]);

  useEffect(() => {
    if (
      !activeProfileIsSaved &&
      state === 'ready' &&
      chart &&
      chart.interpretationStatus !== 'COMPLETED' &&
      chart.interpretationStatus !== 'FAILED'
    ) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [state, chart?.interpretationStatus, activeProfileIsSaved]);

  const openAddCompanionModal = () => {
    setEditingCompanion(null);
    setCompanionForm(createEmptyCompanionForm());
    setIosPickerTarget(null);
    setIosPickerDraftDate(new Date());
    setPlaceQuery('');
    setPlaceSuggestions([]);
    setLocationPickerTarget(null);
    setLocationPickerQuery('');
    setCompanionModalVisible(true);
  };

  const openEditCompanionModal = (person: SavedPerson) => {
    setEditingCompanion(person);
    const nextForm = createCompanionFormFromPerson(person);
    setCompanionForm(nextForm);
    setIosPickerTarget(null);
    setIosPickerDraftDate(nextForm.birthDateValue ?? nextForm.birthTimeValue ?? new Date());
    setPlaceQuery(nextForm.birthLocation);
    setPlaceSuggestions([]);
    setLocationPickerTarget(null);
    setLocationPickerQuery('');
    setCompanionModalVisible(true);
  };

  const closeCompanionModal = () => {
    setCompanionModalVisible(false);
    setEditingCompanion(null);
    setPlaceSuggestions([]);
    setPlaceSearchLoading(false);
    setPlaceSelecting(false);
    setIosPickerTarget(null);
    setLocationPickerTarget(null);
    setLocationPickerQuery('');
  };

  const applyPickerValue = (target: PickerTarget, nextDate: Date) => {
    setCompanionForm((prev) => {
      if (target === 'date') {
        return { ...prev, birthDateValue: nextDate };
      }
      return { ...prev, birthTimeValue: nextDate };
    });
  };

  const openNativePicker = (target: PickerTarget) => {
    const currentValue =
      target === 'date'
        ? (companionForm.birthDateValue ?? new Date())
        : (companionForm.birthTimeValue ?? new Date());

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: currentValue,
        mode: target,
        is24Hour: true,
        display: target === 'date' ? 'default' : 'spinner',
        themeVariant: 'light' as any,
        onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
          if (event.type === 'set' && selectedDate) {
            applyPickerValue(target, selectedDate);
          }
        },
      } as any);
      return;
    }

    setIosPickerDraftDate(currentValue);
    setIosPickerTarget(target);
  };

  const onIosPickerChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setIosPickerDraftDate(selectedDate);
    }
  };

  const confirmIosPicker = () => {
    if (!iosPickerTarget) return;
    applyPickerValue(iosPickerTarget, iosPickerDraftDate);
    setIosPickerTarget(null);
  };

  const fallbackCountryCode = companionForm.countryCode ?? 'TR';
  const fallbackCityOptions = useMemo(
    () =>
      dedupeByNormalizedText(
        (CITIES[fallbackCountryCode] ?? CITIES.default ?? []).filter((c) => c.name !== 'Other/Manual Entry'),
        (c) => c.name,
      ),
    [fallbackCountryCode],
  );
  const fallbackDistrictOptions = useMemo(
    () =>
      fallbackCountryCode === 'TR' && companionForm.city
        ? dedupeByNormalizedText(DISTRICTS[companionForm.city] ?? [], (d) => d)
        : [],
    [fallbackCountryCode, companionForm.city],
  );

  const locationPickerTitle = useMemo(() => {
    if (locationPickerTarget === 'country') return 'Ülke Seç';
    if (locationPickerTarget === 'city') return 'İl / Şehir Seç';
    if (locationPickerTarget === 'district') return 'İlçe Seç';
    return 'Seçim Yap';
  }, [locationPickerTarget]);

  const locationPickerItems = useMemo(() => {
    const q = locationPickerQuery.trim().toLocaleLowerCase('tr-TR');
    if (locationPickerTarget === 'country') {
      return COUNTRIES
        .map((country) => ({
          key: country.code,
          label: country.name,
          subLabel: country.code,
          value: country.code,
        }))
        .filter((item) => !q || item.label.toLocaleLowerCase('tr-TR').includes(q) || item.subLabel.toLowerCase().includes(q));
    }

    if (locationPickerTarget === 'city') {
      return fallbackCityOptions
        .map((city) => ({
          key: city.name,
          label: city.name,
          subLabel: city.timezone,
          value: city.name,
        }))
        .filter((item) => !q || item.label.toLocaleLowerCase('tr-TR').includes(q));
    }

    if (locationPickerTarget === 'district') {
      return fallbackDistrictOptions
        .map((district) => ({
          key: district,
          label: district,
          subLabel: companionForm.city ?? undefined,
          value: district,
        }))
        .filter((item) => !q || item.label.toLocaleLowerCase('tr-TR').includes(q));
    }

    return [];
  }, [locationPickerTarget, locationPickerQuery, fallbackCityOptions, fallbackDistrictOptions, companionForm.city]);

  const openFallbackLocationPicker = (target: LocationPickerTarget) => {
    if (target === 'city' && !fallbackCountryCode) {
      Alert.alert('Önce Ülke Seçin', 'Lütfen önce ülke seçin.');
      return;
    }
    if (target === 'district' && !companionForm.city) {
      Alert.alert('Önce İl Seçin', 'Lütfen önce il/şehir seçin.');
      return;
    }
    setLocationPickerQuery('');
    setLocationPickerTarget(target);
  };

  const closeFallbackLocationPicker = () => {
    setLocationPickerTarget(null);
    setLocationPickerQuery('');
    pendingLocationPickerScrollRef.current = false;
  };

  const scrollToLocationPickerInline = useCallback((animated = true) => {
    const scrollNode = companionFormScrollRef.current;
    if (!scrollNode) return false;
    const centerBias = companionFormViewportHeight > 0 ? Math.round(companionFormViewportHeight * 0.28) : 140;
    const y = Math.max(0, locationPickerInlineYRef.current + centerBias);
    scrollNode.scrollTo({ y, animated });
    return locationPickerInlineYRef.current > 0;
  }, [companionFormViewportHeight]);

  const applyFallbackLocationSelection = (value: string) => {
    setCompanionForm((prev) => {
      if (locationPickerTarget === 'country') {
        const nextCountryCode = value;
        const nextForm: CompanionFormState = {
          ...prev,
          countryCode: nextCountryCode,
          city: undefined,
          district: undefined,
          timezone: undefined,
          latitude: undefined,
          longitude: undefined,
        };
        nextForm.birthLocation = composeFallbackBirthLocation(nextForm);
        return nextForm;
      }

      if (locationPickerTarget === 'city') {
        const cityMeta = (CITIES[prev.countryCode ?? 'TR'] ?? CITIES.default ?? []).find((city) => city.name === value);
        const nextForm: CompanionFormState = {
          ...prev,
          city: value,
          district: undefined,
          timezone: cityMeta?.timezone ?? prev.timezone,
          latitude: undefined,
          longitude: undefined,
        };
        nextForm.birthLocation = composeFallbackBirthLocation(nextForm);
        return nextForm;
      }

      if (locationPickerTarget === 'district') {
        const nextForm: CompanionFormState = {
          ...prev,
          district: value,
          latitude: undefined,
          longitude: undefined,
        };
        nextForm.birthLocation = composeFallbackBirthLocation(nextForm);
        return nextForm;
      }

      return prev;
    });
    closeFallbackLocationPicker();
  };

  useEffect(() => {
    if (!companionModalVisible || companionUseGooglePlaces || !locationPickerTarget) return;
    pendingLocationPickerScrollRef.current = true;

    const delays = [40, 120, 240];
    const timers = delays.map((delay) =>
      setTimeout(() => {
        if (!pendingLocationPickerScrollRef.current) return;
        const ok = scrollToLocationPickerInline(true);
        if (ok) pendingLocationPickerScrollRef.current = false;
      }, delay),
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [locationPickerTarget, companionModalVisible, companionUseGooglePlaces, scrollToLocationPickerInline]);

  const handleDeleteCompanion = (person: SavedPerson) => {
    if (!user?.id) return;
    const userId = user.id;
    Alert.alert(
      'Kişiyi Sil',
      `${person.name} profilini silmek istiyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePerson(person.id, userId);
              clearSynastry();
              if (sameProfile(resolvedActiveProfile, person, userId)) {
                setActiveProfile(user);
              }
            } catch (e: any) {
              Alert.alert('Hata', e?.response?.data?.message ?? 'Kişi silinemedi.');
            }
          },
        },
      ]
    );
  };

  const handleAvatarPress = (profile: Profile) => {
    if (profileMode === 'compare') {
      void Haptics.selectionAsync();
    }
    if (profileMode === 'compare') {
      toggleComparisonProfile(profile);
      return;
    }
    setActiveProfile(profile);
  };

  const handleSavedAvatarLongPress = (person: SavedPerson) => {
    Alert.alert(
      person.name,
      'Bu profil için işlem seçin',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Düzenle', onPress: () => openEditCompanionModal(person) },
        { text: 'Sil', style: 'destructive', onPress: () => handleDeleteCompanion(person) },
      ]
    );
  };

  const handleSavedAvatarPress = (person: SavedPerson) => {
    if (profileMode === 'compare') {
      handleAvatarPress(person);
      return;
    }

    Alert.alert(
      person.name,
      'Bu profil için işlem seçin',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Profili Aç', onPress: () => setActiveProfile(person) },
        { text: 'Düzenle', onPress: () => openEditCompanionModal(person) },
        { text: 'Sil', style: 'destructive', onPress: () => handleDeleteCompanion(person) },
      ],
    );
  };

  const handleSaveCompanion = async () => {
    if (!user?.id) return;

    const name = companionForm.name.trim();
    const birthDateValue = companionForm.birthDateValue;
    const birthLocation = (companionUseGooglePlaces
      ? companionForm.birthLocation
      : (composeFallbackBirthLocation(companionForm) || companionForm.birthLocation)
    ).trim();

    if (!name) {
      Alert.alert('Eksik Bilgi', 'Lütfen isim girin.');
      return;
    }
    if (!birthDateValue) {
      Alert.alert('Eksik Bilgi', 'Lütfen doğum tarihi seçin.');
      return;
    }
    if (!birthLocation) {
      Alert.alert('Eksik Bilgi', 'Lütfen doğum lokasyonu seçin veya yazın.');
      return;
    }

    const request: SavedPersonRequest = {
      userId: user.id,
      name,
      birthDate: formatDateForApi(birthDateValue),
      birthTime: companionForm.birthTimeValue ? formatTimeForApi(companionForm.birthTimeValue) : undefined,
      birthLocation,
      latitude: companionForm.latitude,
      longitude: companionForm.longitude,
      timezone: companionForm.timezone,
      gender: companionForm.gender,
      relationshipType: companionForm.relationshipType,
      relationshipCategory: companionForm.relationshipType,
    };

    setCompanionSaving(true);
    try {
      const saved = await savePerson(request, editingCompanion?.id);
      setActiveProfile(saved);
      clearSynastry();
      closeCompanionModal();
      setProfileMode('switch');
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message ?? 'Kişi kaydedilemedi.');
    } finally {
      setCompanionSaving(false);
    }
  };

  useEffect(() => {
    if (!companionModalVisible || !companionUseGooglePlaces) {
      setPlaceSuggestions([]);
      return;
    }

    const query = placeQuery.trim();
    if (!query || query.length < 2) {
      setPlaceSuggestions([]);
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setPlaceSearchLoading(true);
      try {
        const suggestions = await searchGooglePlaceSuggestions(query, placesSessionToken);
        if (!cancelled) {
          setPlaceSuggestions(suggestions.slice(0, 6));
        }
      } catch {
        if (!cancelled) {
          setPlaceSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setPlaceSearchLoading(false);
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [placeQuery, companionModalVisible, placesSessionToken, companionUseGooglePlaces]);

  const handleSelectPlaceSuggestion = async (suggestion: GooglePlaceSuggestion) => {
    setPlaceSelecting(true);
    try {
      const selected = await getGooglePlaceSelection(suggestion.placeId, placesSessionToken);
      if (!selected) {
        setCompanionForm((prev) => ({
          ...prev,
          birthLocation: suggestion.description,
          latitude: undefined,
          longitude: undefined,
          timezone: undefined,
        }));
        setPlaceQuery(suggestion.description);
      } else {
        setCompanionForm((prev) => ({
          ...prev,
          birthLocation: selected.address || suggestion.description,
          latitude: selected.latitude,
          longitude: selected.longitude,
          timezone: selected.timezone ?? prev.timezone,
        }));
        setPlaceQuery(selected.address || suggestion.description);
      }
      setPlaceSuggestions([]);
    } finally {
      setPlaceSelecting(false);
    }
  };

  const comparisonSelection = selectedForComparison;
  const comparisonPair = comparisonSelection.length === 2 ? comparisonSelection : null;
  const comparisonSavedProfiles = useMemo(
    () => (comparisonPair?.filter((p): p is SavedPerson => isSavedPersonProfile(p)) ?? []),
    [comparisonPair]
  );
  const comparisonRelationshipType = useMemo<RelationshipType>(() => {
    const lastWithType = [...comparisonSavedProfiles].reverse().find((p) => p.relationshipType);
    return (lastWithType?.relationshipType ?? comparisonSavedProfiles[0]?.relationshipType ?? 'FRIENDSHIP') as RelationshipType;
  }, [comparisonSavedProfiles]);
  const canRunSynastry = Boolean(
    user?.id &&
    comparisonPair &&
    comparisonPair.length === 2 &&
    comparisonSavedProfiles.length >= 1
  );

  const getComparisonBadgeIndex = useCallback((profile: Profile) => {
    const idx = comparisonSelection.findIndex((p) => sameProfile(p, profile, user?.id));
    return idx >= 0 ? idx + 1 : null;
  }, [comparisonSelection, user?.id]);

  const handleRunComparison = useCallback(async () => {
    if (!user?.id || !comparisonPair) return;
    const [first, second] = comparisonPair;

    let personAId: number | null = null;
    let personBId: number | null = null;

    if (isSavedPersonProfile(first) && isSavedPersonProfile(second)) {
      personAId = first.id;
      personBId = second.id;
    } else {
      const saved = isSavedPersonProfile(first) ? first : (isSavedPersonProfile(second) ? second : null);
      const selfProfile = !isSavedPersonProfile(first) ? first : (!isSavedPersonProfile(second) ? second : null);
      if (!saved || !selfProfile || !sameProfile(selfProfile, user, user.id)) {
        Alert.alert('Karşılaştırma Sınırı', 'Karşılaştırma için iki kayıtlı kişi veya siz + bir kayıtlı kişi seçin.');
        return;
      }
      personAId = null; // authenticated requester user chart
      personBId = saved.id;
    }

    if (!personBId) {
      Alert.alert('Karşılaştırma Hatası', 'İkinci profil bulunamadı.');
      return;
    }

    try {
      clearSynastry();
      const started = await useSynastryStore.getState().analyzePair({
        userId: user.id,
        savedPersonId: personBId,
        personAId,
        personBId,
        relationshipType: comparisonRelationshipType,
        userGender: user.gender ?? null,
        locale: i18n.language,
      });
      if (started.status !== 'COMPLETED' && started.status !== 'FAILED') {
        await pollSynastry(started.id);
      }
    } catch (e: any) {
      Alert.alert('Analiz Hatası', e?.response?.data?.message ?? 'Sinastri analizi başlatılamadı.');
    }
  }, [
    user,
    comparisonPair,
    comparisonRelationshipType,
    pollSynastry,
    clearSynastry,
    i18n.language,
  ]);

  useEffect(() => {
    if (profileMode !== 'compare') {
      clearComparisonSelection();
    }
  }, [profileMode, clearComparisonSelection]);

  const openPlanetSheet = (planet: PlanetPosition) => {
    setSelectedPlanet(planet);
    setSheetVisible(true);
  };

  const closePlanetSheet = () => {
    setSheetVisible(false);
    setTimeout(() => setSelectedPlanet(null), 300);
  };

  const openHouseSheet = (house: HousePlacement) => {
    setSelectedHouse(house);
    setHouseSheetVisible(true);
  };

  const closeHouseSheet = () => {
    setHouseSheetVisible(false);
    setTimeout(() => setSelectedHouse(null), 300);
  };

  const openAspectSheet = (asp: PlanetaryAspect) => {
    setSelectedAspect(asp);
    setAspectSheetVisible(true);
  };

  const closeAspectSheet = () => {
    setAspectSheetVisible(false);
    setTimeout(() => setSelectedAspect(null), 300);
  };

  const openBigThreeSheet = (role: BigThreeRole) => {
    setSelectedBigThreeRole(role);
    setBigThreeSheetVisible(true);
  };

  const closeBigThreeSheet = () => {
    setBigThreeSheetVisible(false);
    setTimeout(() => setSelectedBigThreeRole(null), 220);
  };

  useEffect(() => {
    setHeroInfoExpanded(false);
    setProfileSwitcherVisible(true);
    sectionJumpTimersRef.current.forEach(clearTimeout);
    sectionJumpTimersRef.current = [];
  }, [resolvedActiveProfile]);

  useEffect(() => {
    return () => {
      sectionJumpTimersRef.current.forEach(clearTimeout);
      sectionJumpTimersRef.current = [];
    };
  }, []);

  const toggleAccordion = useCallback((key: string) => {
    manualAccordionControlRef.current = true;
    setOpenAccordionKey((prev) => (prev === key ? null : (key as NatalAccordionKey)));
  }, []);

  const registerAccordionLayout = useCallback((id: string, y: number, height: number) => {
    const key = id as NatalAccordionKey;
    const prev = accordionLayoutsRef.current[key];
    const looksLikeLocalChildY = y <= 1 && (prev?.y ?? 0) > 1;
    accordionLayoutsRef.current[key] = {
      y: looksLikeLocalChildY ? (prev?.y ?? y) : y,
      height,
    };
  }, []);

  const registerAccordionItemWrapperLayout = useCallback((key: DraggableNatalSectionKey, y: number, height: number) => {
    accordionLayoutsRef.current[key] = {
      y: Math.max(0, accordionListBaseYRef.current + y),
      height,
    };
  }, []);

  const jumpToAccordionSection = useCallback((targetKey: NatalAccordionKey) => {
    manualAccordionControlRef.current = true;
    setHeroInfoExpanded(false);
    setProfileSwitcherVisible(false);
    setOpenAccordionKey(targetKey);

    sectionJumpTimersRef.current.forEach(clearTimeout);
    sectionJumpTimersRef.current = [];

    const attemptScroll = (attempt = 0) => {
      const layout = accordionLayoutsRef.current[targetKey];
      const scrollNode = mainScrollRef.current;
      const stickyOffset = Math.max(0, stickyHeroHeight - 8);
      const viewportHeight = mainScrollViewportHeight > 0
        ? mainScrollViewportHeight
        : Dimensions.get('window').height;

      const scrollToComputedY = (contentY: number, measuredHeight?: number) => {
        const visibleTopInset = stickyOffset + 10;
        const visibleHeight = Math.max(240, viewportHeight - visibleTopInset - 22);
        // Aggressive upper-middle alignment:
        // put the accordion header near the upper reading band so opened content stays visible.
        const upperMiddleOffset = Math.max(14, Math.min(84, visibleHeight * 0.16));
        const y = Math.max(0, contentY - visibleTopInset - upperMiddleOffset);
        if (typeof measuredHeight === 'number' && Number.isFinite(measuredHeight)) {
          accordionLayoutsRef.current[targetKey] = { y: contentY, height: measuredHeight };
        }
        scrollNode.scrollTo({ y, animated: true });
      };

      const targetRef = accordionItemRefsRef.current[targetKey];
      const nativeScrollRef = scrollNode?.getNativeScrollRef?.() ?? scrollNode;
      const nativeScrollHandle = nativeScrollRef ? findNodeHandle(nativeScrollRef) : null;

      if (targetRef && nativeScrollHandle && typeof targetRef.measureLayout === 'function' && scrollNode?.scrollTo) {
        try {
          targetRef.measureLayout(
            nativeScrollHandle,
            (_x: number, yInScrollViewport: number, _w: number, measuredHeight: number) => {
              const contentY = Math.max(0, lastKnownScrollYRef.current + yInScrollViewport);
              scrollToComputedY(contentY, measuredHeight);
            },
            () => {
              if (layout && scrollNode?.scrollTo) {
                scrollToComputedY(layout.y, layout.height);
              }
            },
          );
          return;
        } catch {
          // fallback below
        }
      }

      if (layout && scrollNode?.scrollTo) {
        scrollToComputedY(layout.y, layout.height);
        return;
      }

      if (attempt >= 10) return;
      const timer = setTimeout(
        () => attemptScroll(attempt + 1),
        attempt === 0 ? 90 : 120,
      );
      sectionJumpTimersRef.current.push(timer);
    };

    [40, 140, 280, 460, 700].forEach((delay) => {
      const timer = setTimeout(() => {
        setOpenAccordionKey(targetKey);
        attemptScroll(0);
      }, delay);
      sectionJumpTimersRef.current.push(timer);
    });
  }, [stickyHeroHeight, mainScrollViewportHeight]);

  const handleHeroMetricPress = useCallback((target: HeroMetricTarget) => {
    setHeroInfoExpanded(false);
    setProfileSwitcherVisible(false);
    if (target === 'planet_positions') {
      jumpToAccordionSection('planet_positions');
      return;
    }
    if (target === 'house_positions') {
      jumpToAccordionSection('house_positions');
      return;
    }
    jumpToAccordionSection('aspect_list');
  }, [jumpToAccordionSection]);

  const handleHeroBigThreePress = useCallback((role: HeroBigThreeRole) => {
    openBigThreeSheet(role as BigThreeRole);
  }, []);

  const autoFocusNearestAccordion = useCallback((scrollY: number) => {
    if (!autoAccordionFocusEnabledRef.current) return;
    if (manualAccordionControlRef.current) return;
    const entries = Object.entries(accordionLayoutsRef.current) as Array<[NatalAccordionKey, { y: number; height: number }]>;
    if (!entries.length) return;

    const focusLine = scrollY + 170;
    const candidates = entries
      .filter(([, layout]) => Number.isFinite(layout.y))
      .map(([key, layout]) => {
        const distance = Math.abs(layout.y - focusLine);
        return { key, distance, y: layout.y };
      })
      .sort((a, b) => a.distance - b.distance);

    const next = candidates[0]?.key;
    if (next && next !== openAccordionKey) {
      setOpenAccordionKey(next);
    }
  }, [openAccordionKey]);

  const queueAccordionAutoFocus = useCallback((scrollY?: number, delayMs = 80) => {
    if (!autoAccordionFocusEnabledRef.current) return;
    if (manualAccordionControlRef.current) return;
    if (typeof scrollY === 'number') {
      lastKnownScrollYRef.current = scrollY;
    }
    if (accordionFocusTimerRef.current) {
      clearTimeout(accordionFocusTimerRef.current);
      accordionFocusTimerRef.current = null;
    }
    accordionFocusTimerRef.current = setTimeout(() => {
      autoFocusNearestAccordion(lastKnownScrollYRef.current);
      accordionFocusTimerRef.current = null;
    }, delayMs);
  }, [autoFocusNearestAccordion]);

  const handleNatalScroll = useCallback((event: any) => {
    const y = event?.nativeEvent?.contentOffset?.y ?? 0;
    lastKnownScrollYRef.current = y;
    if (y > 24) {
      setHeroInfoExpanded((prev) => (prev ? false : prev));
    }
    if (y > 72) {
      setProfileSwitcherVisible((prev) => (prev ? false : prev));
    } else if (y < 12) {
      setProfileSwitcherVisible((prev) => (prev ? true : prev));
    }
  }, []);

  const handleNatalScrollEndDrag = useCallback((event: any) => {
    const y = event?.nativeEvent?.contentOffset?.y ?? lastKnownScrollYRef.current;
    if (y < 12) {
      setProfileSwitcherVisible(true);
    }
    queueAccordionAutoFocus(y, 140);
  }, [queueAccordionAutoFocus]);

  const handleNatalMomentumScrollEnd = useCallback((event: any) => {
    const y = event?.nativeEvent?.contentOffset?.y ?? lastKnownScrollYRef.current;
    if (y < 12) {
      setProfileSwitcherVisible(true);
    }
    queueAccordionAutoFocus(y, 24);
  }, [queueAccordionAutoFocus]);

  const hotspotAspects = useMemo(
    () => [...(chart?.aspects ?? [])].sort((a, b) => a.orb - b.orb).slice(0, 2),
    [chart?.aspects],
  );
  const visibleDraggableSectionKeys = useMemo<DraggableNatalSectionKey[]>(() => {
    const visibleMap: Record<DraggableNatalSectionKey, boolean> = {
      night_poster: !!chart,
      big_three: !!chart,
      hotspots: hotspotAspects.length > 0,
      natal_chart_visual: (chart?.planets?.length ?? 0) > 0,
      aspect_matrix_table: (chart?.aspects?.length ?? 0) > 0 || (chart?.planets?.length ?? 0) > 0,
      cosmic_position_details: (chart?.planets?.length ?? 0) > 0,
      cosmic_balance: (chart?.planets?.length ?? 0) > 0,
      planet_positions: (chart?.planets?.length ?? 0) > 0,
      aspect_list: (chart?.aspects?.length ?? 0) > 0,
      house_positions: (chart?.houses?.length ?? 0) > 0,
      ai_interpretation: !activeProfileIsSaved && !!chart,
    };

    const orderedVisible = sectionOrder.filter((key) => visibleMap[key]);
    const missingVisible = DEFAULT_NATAL_SECTION_ORDER.filter((key) => visibleMap[key] && !orderedVisible.includes(key));
    return [...orderedVisible, ...missingVisible];
  }, [sectionOrder, chart, hotspotAspects.length, activeProfileIsSaved]);

  const handleSectionReorder = useCallback((visibleOrderedKeys: DraggableNatalSectionKey[]) => {
    const visibleSet = new Set(visibleOrderedKeys);
    const hidden = DEFAULT_NATAL_SECTION_ORDER.filter((key) => !visibleSet.has(key));
    setSectionOrder(normalizeDraggableSectionOrder([...visibleOrderedKeys, ...hidden]));
  }, []);
  const bigThreeSignByRole = useMemo<Record<BigThreeRole, string | null>>(
    () => ({
      sun: chart?.sunSign ?? null,
      moon: chart?.moonSign ?? null,
      rising: chart?.risingSign ?? null,
    }),
    [chart?.sunSign, chart?.moonSign, chart?.risingSign],
  );

  // ═══════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════
  if (state === 'loading') {
    return (
      <SafeScreen edges={['top', 'left', 'right']} style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.violet} />
          <Animated.View style={[styles.skelLine, { width: 180, opacity: pulseAnim }]} />
          <Animated.View style={[styles.skelLine, { width: 120, opacity: pulseAnim }]} />
          <Text style={styles.loadingText}>Haritaniz yukleniyor...</Text>
        </View>
      </SafeScreen>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // CALCULATING STATE
  // ═══════════════════════════════════════════════════════════════════
  if (state === 'calculating') {
    return (
      <SafeScreen edges={['top', 'left', 'right']} style={styles.container}>
        <View style={styles.center}>
          <Animated.Text
            style={[
              styles.calcSymbol,
              {
                opacity: calcAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.4, 1, 0.4],
                }),
                transform: [
                  {
                    scale: calcAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.8, 1.2, 0.8],
                    }),
                  },
                ],
              },
            ]}
          >
            {ZODIAC_SYMBOLS[Math.floor(Date.now() / 500) % 12]}
          </Animated.Text>
          <Text style={styles.calcTitle}>Yildizlar Hesaplaniyor...</Text>
          <Text style={styles.calcSub}>Bu islem birkac saniye surebilir</Text>
        </View>
      </SafeScreen>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════════════════════════════
  if (state === 'error') {
    return (
      <SafeScreen edges={['top', 'left', 'right']} style={styles.container}>
        <View style={styles.center}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={32} color={colors.redBright} />
          </View>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => loadChart(true)}
            accessibilityLabel={t('natalChart.retry')}
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={16} color={colors.white} />
            <Text style={styles.retryBtnText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // READY STATE — Modern Light UI
  // ═══════════════════════════════════════════════════════════════════
  const sunInfo = getZodiacInfo(chart?.sunSign);
  const moonInfo = getZodiacInfo(chart?.moonSign);
  const risingInfo = getZodiacInfo(chart?.risingSign);
  const activeProfileName = getProfileName(resolvedActiveProfile);
  const selectedComparisonPairKey = comparisonPair
    ? canonicalPairKey(comparisonPair.map((p) => profileKey(p, user?.id)))
    : null;
  const resultPairKey = (() => {
    if (!currentSynastry || !user?.id) return null;
    const aIsSaved = currentSynastry.personAType === 'SAVED_PERSON';
    const bIsSaved = currentSynastry.personBType
      ? currentSynastry.personBType === 'SAVED_PERSON'
      : (currentSynastry.personBId != null || currentSynastry.savedPersonId != null);
    const aKey = aIsSaved
      ? `saved:${currentSynastry.personAId}`
      : `user:${user.id}`;
    const bKey = bIsSaved
      ? `saved:${currentSynastry.personBId ?? currentSynastry.savedPersonId}`
      : `user:${user.id}`;
    return canonicalPairKey([aKey, bKey]);
  })();
  const comparisonResult =
    selectedComparisonPairKey && resultPairKey && selectedComparisonPairKey === resultPairKey
      ? currentSynastry
      : null;

  const comparisonPersonAName = comparisonResult?.personAName ?? (comparisonPair ? getProfileName(comparisonPair[0]) : 'Kişi A');
  const comparisonPersonBName = comparisonResult?.personBName ?? (comparisonPair ? getProfileName(comparisonPair[1]) : 'Kişi B');
  const comparisonAProfile = comparisonPair?.[0] ?? null;
  const comparisonBProfile = comparisonPair?.[1] ?? null;
  const comparisonAChart = comparisonAProfile
    ? (isSavedPersonProfile(comparisonAProfile) ? savedPersonToChart(comparisonAProfile) : (cachedChart ?? chart))
    : null;
  const comparisonBChart = comparisonBProfile
    ? (isSavedPersonProfile(comparisonBProfile) ? savedPersonToChart(comparisonBProfile) : (cachedChart ?? chart))
    : null;
  const comparisonASun = getZodiacInfo(comparisonAChart?.sunSign);
  const comparisonBSun = getZodiacInfo(comparisonBChart?.sunSign);
  const comparisonPersonASignLabel = `${comparisonASun.symbol} ${comparisonASun.name}`;
  const comparisonPersonBSignLabel = `${comparisonBSun.symbol} ${comparisonBSun.name}`;
  const comparisonRelationLabel = relationshipLabel(comparisonRelationshipType);
  const comparisonAspectsCount = comparisonResult?.crossAspects?.length ?? 0;
  const comparisonOverallScore =
    comparisonResult?.harmonyScore ?? comparisonResult?.scoreBreakdown?.overall ?? null;

  const openMatchCardPreview = () => {
    if (!comparisonResult?.id) return;
    router.push({
      pathname: '/match-card-preview',
      params: { matchId: String(comparisonResult.id) },
    } as any);
  };

  const openNightSkyPosterPreview = () => {
    if (!chart) return;
    setNightSkyPosterDraft({
      userId: user?.id,
      chartId: chart.id,
      name: activeProfileName || chart.name || 'Mystic Soul',
      birthDate: String(chart.birthDate),
      birthTime: chart.birthTime ?? null,
      birthLocation: chart.birthLocation,
      latitude: chart.latitude,
      longitude: chart.longitude,
      timezone: user?.timezone ?? undefined,
      shareUrl: NIGHT_SKY_POSTER_LINK,
      planets: chart.planets ?? [],
      houses: chart.houses ?? [],
      createdAt: Date.now(),
    });
    router.push('/night-sky-poster-preview' as any);
  };

  const openNatalVisualsPreview = () => {
    if (!chart) return;
    setNatalVisualsDraft({
      name: activeProfileName || chart.name || 'Mystic Soul',
      birthDate: String(chart.birthDate),
      birthTime: chart.birthTime ?? null,
      birthLocation: chart.birthLocation,
      risingSign: chart.risingSign,
      planets: chart.planets ?? [],
      houses: chart.houses ?? [],
      aspects: chart.aspects ?? [],
      createdAt: Date.now(),
    });
    router.push('/natal-visuals-preview' as any);
  };

  const renderSectionDragHandle = (
    drag: () => void,
    isActive: boolean,
    label: string,
  ) => {
    if (!ENABLE_SECTION_DND) return null;
    return (
    <Pressable
      onLongPress={(e) => {
        (e as any)?.stopPropagation?.();
        drag();
      }}
      onPress={(e) => (e as any)?.stopPropagation?.()}
      delayLongPress={120}
      hitSlop={8}
      style={[
        styles.sectionDragHandle,
        isActive && styles.sectionDragHandleActive,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label} bölümünü sürükle`}
    >
      <Ionicons name="reorder-three-outline" size={16} color={colors.muted} />
    </Pressable>
    );
  };

  const renderAccordionSectionByKey = (
    key: DraggableNatalSectionKey,
    drag: () => void,
    isActive: boolean,
  ) => {
    const headerRight = renderSectionDragHandle(drag, isActive, key);

    switch (key) {
      case 'night_poster':
        if (!chart) return null;
        return (
          <AccordionSection
            id="night_poster"
            title="Doğduğun Gece"
            subtitle="Paylaşılabilir gece posteri • Dokunarak poster modülünü aç"
            icon="moon-outline"
            expanded={openAccordionKey === 'night_poster'}
            onToggle={toggleAccordion}
            onLayout={registerAccordionLayout}
            lazy
            deferBodyMount
            headerRight={headerRight}
          >
            <View style={styles.posterAccordionInner}>
              <Text style={styles.posterPreviewHint}>
                Doğum anının gökyüzü estetiğini buradan önizleyebilirsin. Tam ekran poster, varyant ve paylaşım ayarları için aşağıdaki butonu kullan.
              </Text>
              <View style={styles.posterPreviewShell}>
                <View style={styles.posterPreviewViewport}>
                  <View style={styles.posterPreviewScaled}>
                    <BirthNightSkyPoster
                      name={activeProfileName || chart.name || 'Mystic Soul'}
                      birthDate={String(chart.birthDate)}
                      birthTime={chart.birthTime ?? null}
                      birthLocation={chart.birthLocation}
                      latitude={chart.latitude ?? 0}
                      longitude={chart.longitude ?? 0}
                      shareUrl={NIGHT_SKY_POSTER_LINK}
                      planets={chart.planets ?? []}
                      houses={chart.houses ?? []}
                      variant="minimal"
                    />
                  </View>
                </View>
              </View>
              <View style={styles.posterModuleActions}>
                <Pressable
                  style={styles.posterBtn}
                  onPress={openNightSkyPosterPreview}
                  accessibilityLabel="Doğduğun gece posterini oluştur"
                  accessibilityRole="button"
                >
                  <Ionicons name="moon-outline" size={16} color={colors.goldDark} />
                  <Text style={styles.posterBtnText}>Poster Atölyesini Aç</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.goldDark} />
                </Pressable>
              </View>
            </View>
          </AccordionSection>
        );

      case 'big_three':
        return (
          <AccordionSection
            id="big_three"
            title="Big Three (Güneş • Ay • Yükselen)"
            subtitle="İkonlara dokunarak karakter, etki ve dikkat noktalarını aç"
            icon="planet-outline"
            expanded={openAccordionKey === 'big_three'}
            onToggle={toggleAccordion}
            onLayout={registerAccordionLayout}
            headerRight={headerRight}
          >
            <View style={styles.trinityRow}>
              {[
                { role: 'sun' as const, icon: '☉', label: t('natalChart.sun'), info: sunInfo },
                { role: 'moon' as const, icon: '☽', label: t('natalChart.moon'), info: moonInfo },
                { role: 'rising' as const, icon: '↑', label: t('natalChart.rising'), info: risingInfo },
              ].map((item) => (
                <Pressable
                  key={item.label}
                  style={({ pressed }) => [styles.trinityBubble, pressed && styles.trinityBubblePressed]}
                  onPress={() => openBigThreeSheet(item.role)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label} detayını aç`}
                >
                  <Text style={styles.trinityIcon}>{item.icon}</Text>
                  <Text style={styles.trinitySign}>{item.info.symbol} {item.info.name}</Text>
                  <Text style={styles.trinityLabel}>{item.label}</Text>
                  <Text style={styles.trinityHint}>Detayı Aç</Text>
                </Pressable>
              ))}
            </View>
          </AccordionSection>
        );

      case 'hotspots':
        if (hotspotAspects.length === 0) return null;
        return (
          <AccordionSection
            id="hotspots"
            title={t('natalChart.cosmicHotspots')}
            subtitle="En güçlü çalışan açılar • dokunup psikolojik dinamiği aç"
            icon="flash-outline"
            expanded={openAccordionKey === 'hotspots'}
            onToggle={toggleAccordion}
            onLayout={registerAccordionLayout}
            headerRight={headerRight}
          >
            <View style={styles.section}>
              <View style={styles.hotspotRow}>
                {hotspotAspects.map((asp, i) => (
                  <Pressable
                    key={`hotspot-${i}`}
                    style={{ flex: 1 }}
                    onPress={() => openAspectSheet(asp)}
                    accessibilityLabel={t('natalChart.cosmicHotspotLabel', {
                      p1: planetNames[asp.planet1] ?? asp.planet1,
                      type: labelAspectType(asp.type),
                      p2: planetNames[asp.planet2] ?? asp.planet2,
                    })}
                    accessibilityRole="button"
                  >
                    <CosmicHotspotCard aspect={asp} index={i} />
                  </Pressable>
                ))}
              </View>
            </View>
          </AccordionSection>
        );

      case 'natal_chart_visual':
        if ((chart?.planets?.length ?? 0) === 0) return null;
        return (
          <AccordionSection
            id="natal_chart_visual"
            title="Dairesel Doğum Haritası"
            subtitle="Ev çizgileri ve gezegen yerleşimleri • görsel önizleme"
            icon="analytics-outline"
            expanded={openAccordionKey === 'natal_chart_visual'}
            onToggle={toggleAccordion}
            onLayout={registerAccordionLayout}
            lazy
            deferBodyMount
            headerRight={headerRight}
          >
            <NatalChartProPanels
              planets={chart?.planets ?? []}
              houses={chart?.houses ?? []}
              aspects={chart?.aspects ?? []}
              risingSign={chart?.risingSign}
              planetNames={planetNames}
              onAspectPress={openAspectSheet}
              panels={['wheel']}
            />
            <View style={styles.posterModuleActions}>
              <Pressable
                style={styles.posterBtn}
                onPress={openNatalVisualsPreview}
                accessibilityLabel="Doğum haritasını tam ekran aç ve indir"
                accessibilityRole="button"
              >
                <Ionicons name="scan-outline" size={16} color={colors.goldDark} />
                <Text style={styles.posterBtnText}>Tam Ekran Gör • İndir</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.goldDark} />
              </Pressable>
            </View>
          </AccordionSection>
        );

      case 'aspect_matrix_table':
        if ((chart?.planets?.length ?? 0) === 0) return null;
        return (
          <AccordionSection
            id="aspect_matrix_table"
            title="Gezegen Etkileşim Tablosu"
            subtitle="Açı matrisi • gezegenler arası etkileşimlerin üçgen görünümü"
            icon="git-network-outline"
            expanded={openAccordionKey === 'aspect_matrix_table'}
            onToggle={toggleAccordion}
            onLayout={registerAccordionLayout}
            lazy
            deferBodyMount
            headerRight={headerRight}
          >
            <NatalChartProPanels
              planets={chart?.planets ?? []}
              houses={chart?.houses ?? []}
              aspects={chart?.aspects ?? []}
              risingSign={chart?.risingSign}
              planetNames={planetNames}
              onAspectPress={openAspectSheet}
              panels={['matrix']}
            />
            <View style={styles.posterModuleActions}>
              <Pressable
                style={styles.posterBtn}
                onPress={openNatalVisualsPreview}
                accessibilityLabel="Gezegen etkileşim tablosunu tam ekran aç ve indir"
                accessibilityRole="button"
              >
                <Ionicons name="grid-outline" size={16} color={colors.goldDark} />
                <Text style={styles.posterBtnText}>Tam Ekran Matris • İndir</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.goldDark} />
              </Pressable>
            </View>
          </AccordionSection>
        );

      case 'cosmic_position_details':
        if ((chart?.planets?.length ?? 0) === 0) return null;
        return (
          <AccordionSection
            id="cosmic_position_details"
            title="Kozmik Konum Detayları"
            subtitle="Gezegen, burç, derece/dakika ve ev konumu teknik listesi"
            icon="list-outline"
            expanded={openAccordionKey === 'cosmic_position_details'}
            onToggle={toggleAccordion}
            onLayout={registerAccordionLayout}
            lazy
            deferBodyMount
            headerRight={headerRight}
          >
            <NatalChartProPanels
              planets={chart?.planets ?? []}
              houses={chart?.houses ?? []}
              aspects={chart?.aspects ?? []}
              risingSign={chart?.risingSign}
              planetNames={planetNames}
              panels={['positions']}
            />
          </AccordionSection>
        );

      case 'cosmic_balance':
        if ((chart?.planets?.length ?? 0) === 0) return null;
        return (
          <AccordionSection
            id="cosmic_balance"
            title="Kozmik Denge"
            subtitle="Element ve nitelik dağılımı • özet yorum"
            icon="pie-chart-outline"
            expanded={openAccordionKey === 'cosmic_balance'}
            onToggle={toggleAccordion}
            onLayout={registerAccordionLayout}
            lazy
            deferBodyMount
            headerRight={headerRight}
          >
            <NatalChartProPanels
              planets={chart?.planets ?? []}
              houses={chart?.houses ?? []}
              aspects={chart?.aspects ?? []}
              risingSign={chart?.risingSign}
              planetNames={planetNames}
              panels={['balance']}
            />
          </AccordionSection>
        );

      case 'planet_positions':
        if (!chart?.planets?.length) return null;
        return (
          <AccordionSection
            id="planet_positions"
            title={t('natalChart.planetaryPositions')}
            subtitle="Her satıra dokunarak karakter + etki + dikkat alanlarını aç"
            icon="sparkles-outline"
            expanded={openAccordionKey === 'planet_positions'}
            onToggle={toggleAccordion}
            onLayout={registerAccordionLayout}
            headerRight={headerRight}
          >
            <View style={styles.section}>
              {chart.planets.map((planet, i) => {
                const trName = planetNames[planet.planet] ?? planet.planet;
                const signInfo = getZodiacInfo(planet.sign);
                const sym = PLANET_SYMBOLS[planet.planet] ?? '⭐';
                return (
                  <Pressable
                    key={`${planet.planet}-${i}`}
                    style={styles.planetRow}
                    onPress={() => openPlanetSheet(planet)}
                    accessibilityLabel={t('natalChart.openPlanetDetails', { name: trName })}
                    accessibilityRole="button"
                  >
                    <View style={styles.planetIconWrap}>
                      <Text style={styles.planetIcon}>{sym}</Text>
                    </View>
                    <View style={styles.planetInfo}>
                      <Text style={styles.planetName}>{trName}</Text>
                      <Text style={styles.planetSign}>
                        {signInfo.symbol} {signInfo.name} {Math.floor(planet.degree)}°{planet.minutes}'
                      </Text>
                    </View>
                    <View style={styles.planetMeta}>
                      <View style={styles.houseBadge}>
                        <Text style={styles.houseBadgeText}>{planet.house}</Text>
                      </View>
                      {planet.retrograde ? (
                        <View style={styles.retroBadge}>
                          <Text style={styles.retroText}>Rx</Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </AccordionSection>
        );

      case 'aspect_list':
        if (!chart?.aspects?.length) return null;
        return (
          <AccordionSection
            id="aspect_list"
            title={t('natalChart.planetaryAspects')}
            subtitle="Ham derece yerine anlamlı açı özeti ve orb yakınlığı gösterilir"
            icon="git-network-outline"
            expanded={openAccordionKey === 'aspect_list'}
            onToggle={toggleAccordion}
            onLayout={registerAccordionLayout}
            headerRight={headerRight}
          >
            <View style={styles.section}>
              <View style={styles.aspectsGrid}>
                {chart.aspects.map((asp, i) => {
                  const info = ASPECT_INFO[asp.type] ?? ASPECT_INFO.CONJUNCTION;
                  const p1Sym = PLANET_SYMBOLS[asp.planet1] ?? '?';
                  const p2Sym = PLANET_SYMBOLS[asp.planet2] ?? '?';
                  return (
                    <Pressable
                      key={`asp-${i}`}
                      onPress={() => openAspectSheet(asp)}
                      accessibilityLabel={t('natalChart.aspectDetailsLabel', { label: labelAspectType(asp.type) })}
                      accessibilityRole="button"
                    >
                      <View style={styles.aspectTag}>
                        <Text style={styles.aspectPlanets}>
                          {p1Sym} {info.symbol} {p2Sym}
                        </Text>
                        <Text style={[styles.aspectLabel, { color: info.color }]}>
                          {labelAspectType(asp.type)}
                        </Text>
                        <Text style={styles.aspectOrb}>{formatAspectAngleHuman(asp)}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </AccordionSection>
        );

      case 'house_positions':
        if (!chart?.houses?.length) return null;
        return (
          <AccordionSection
            id="house_positions"
            title={t('natalChart.housePositions')}
            subtitle="Evlere dokunarak basit açıklama + derin yorum kartını aç"
            icon="home-outline"
            expanded={openAccordionKey === 'house_positions'}
            onToggle={toggleAccordion}
            onLayout={registerAccordionLayout}
            headerRight={headerRight}
          >
            <View style={styles.section}>
              <View style={styles.houseGrid}>
                {chart.houses.map((h) => {
                  const info = getZodiacInfo(h.sign);
                  const houseGloss = HOUSE_GLOSSARY[h.houseNumber];
                  return (
                    <Pressable
                      key={h.houseNumber}
                      style={({ pressed }) => [styles.houseCell, pressed && styles.houseCellPressed]}
                      onPress={() => openHouseSheet(h)}
                      accessibilityRole="button"
                      accessibilityLabel={`${h.houseNumber}. ev detayını aç`}
                    >
                      <View style={styles.houseNumCircle}>
                        <Text style={styles.houseNumText}>{h.houseNumber}</Text>
                      </View>
                      <Text style={styles.houseSign}>
                        {info.symbol} {info.name}
                      </Text>
                      <Text style={styles.houseDeg}>{Math.floor(h.degree)}°</Text>
                      <Text style={styles.houseShortDesc} numberOfLines={2}>
                        {houseGloss?.shortDesc ?? 'Ev teması detayını aç'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </AccordionSection>
        );

      case 'ai_interpretation':
        if (activeProfileIsSaved || !chart) return null;
        return (
          <AccordionSection
            id="ai_interpretation"
            title="AI Analizi"
            subtitle="Kozmik yorum • Türkçe başlıklı alt akordiyonlar ile hiyerarşik okuma"
            icon="sparkles-outline"
            expanded={openAccordionKey === 'ai_interpretation'}
            onToggle={toggleAccordion}
            onLayout={registerAccordionLayout}
            lazy
            deferBodyMount
            headerRight={headerRight}
          >
            <View style={styles.aiAccordionContent}>
              {chart.interpretationStatus === 'COMPLETED' && chart.aiInterpretation ? (
                <StructuredNatalAiInterpretation
                  key={chart.aiInterpretation}
                  text={chart.aiInterpretation}
                  fallbackTextStyle={styles.aiText}
                />
              ) : chart.interpretationStatus === 'FAILED' ? (
                <View style={styles.aiStatus}>
                  <Ionicons name="alert-circle" size={22} color={colors.redBright} />
                  <Text style={styles.aiStatusText}>Yorum olusturulamadi.</Text>
                  <Pressable
                    style={styles.retrySmall}
                    onPress={onRefresh}
                    accessibilityLabel={t('natalChart.retry')}
                    accessibilityRole="button"
                  >
                    <Ionicons name="refresh" size={13} color={colors.violet} />
                    <Text style={styles.retrySmallText}>{t('natalChart.retry')}</Text>
                  </Pressable>
                </View>
              ) : pollExhausted ? (
                <View style={styles.aiStatus}>
                  <Ionicons name="time-outline" size={22} color={colors.muted} />
                  <Text style={styles.aiStatusText}>Yorum henuz hazir degil.</Text>
                  <Pressable
                    style={styles.retrySmall}
                    onPress={() => { setPollExhausted(false); startPolling(); }}
                    accessibilityLabel={t('natalChart.checkAgain')}
                    accessibilityRole="button"
                  >
                    <Ionicons name="refresh" size={13} color={colors.violet} />
                    <Text style={styles.retrySmallText}>{t('natalChart.checkAgain')}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.aiStatus}>
                  <ActivityIndicator size="small" color={colors.violet} />
                  <Animated.View style={[styles.skelLine, { width: '100%', opacity: pulseAnim }]} />
                  <Animated.View style={[styles.skelLine, { width: '90%', opacity: pulseAnim }]} />
                  <Animated.View style={[styles.skelLine, { width: '70%', opacity: pulseAnim }]} />
                  <Text style={styles.aiStatusText}>Yapay zeka yorumunuz hazirlaniyor...</Text>
                </View>
              )}
            </View>
          </AccordionSection>
        );
    }
  };

  const renderDraggableAccordionItem = ({
    item,
    drag,
    isActive,
  }: DraggableRenderItemParams<DraggableNatalSectionKey>) => (
    <ScaleDecorator activeScale={1.015}>
      <View
        ref={(node) => {
          accordionItemRefsRef.current[item] = node;
        }}
        collapsable={false}
        style={[styles.draggableSectionItemWrap, isActive && styles.draggableSectionItemWrapActive]}
        onLayout={(event) => {
          const { y, height } = event.nativeEvent.layout;
          registerAccordionItemWrapperLayout(item, y, height);
        }}
      >
        {renderAccordionSectionByKey(item, drag, isActive)}
      </View>
    </ScaleDecorator>
  );

  const renderProfileSwitcherCard = () => (
    <View style={styles.profileSwitcherCard}>
      <View style={styles.profileSwitcherHeader}>
        <View style={styles.profileSwitcherHeaderTextCol}>
          <Text style={styles.profileSwitcherTitle}>Kozmik Harita Profilleri</Text>
          <Text style={styles.profileSwitcherSub}>
            {profileMode === 'compare'
              ? 'Karşılaştırma için iki profil seçin'
              : 'Haritayı görmek için profili seçin'}
          </Text>
        </View>
        <Pressable
          style={[
            styles.modeChip,
            profileMode === 'compare' && styles.modeChipActive,
          ]}
          onPress={() => setProfileMode((prev) => (prev === 'switch' ? 'compare' : 'switch'))}
          accessibilityRole="button"
          accessibilityLabel="Karşılaştırma modunu aç veya kapat"
        >
          <Scale size={15} color={profileMode === 'compare' ? '#5B4ACB' : colors.muted} />
          <Text style={[
            styles.modeChipText,
            profileMode === 'compare' && styles.modeChipTextActive,
          ]}>
            Karşılaştır
          </Text>
        </Pressable>
      </View>

      <View style={styles.profileSwitcherMetaRow}>
        <View style={styles.profileMetaTag}>
          <Text style={styles.profileMetaTagText}>
            Toplam {savedPeople.length + (user ? 1 : 0)} profil
          </Text>
        </View>
        <View style={[styles.profileMetaTag, profileMode === 'compare' && styles.profileMetaTagActive]}>
          <Text style={[styles.profileMetaTagText, profileMode === 'compare' && styles.profileMetaTagTextActive]}>
            {profileMode === 'compare'
              ? `Karşılaştırma modu • ${selectedForComparison.length}/2 seçili`
              : 'Okuma modu'}
          </Text>
        </View>
      </View>

      <View style={styles.profileScrollerRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.profileScrollerContent}
          style={styles.profileScroller}
        >
          {user && (
            <Pressable
              style={styles.profilePill}
              onPress={() => handleAvatarPress(user)}
              accessibilityRole="button"
              accessibilityLabel="Ben profilini seç"
            >
              {(() => {
                const badgeIndex = profileMode === 'compare' ? getComparisonBadgeIndex(user) : null;
                return (
                  <View style={[
                    styles.avatarCircle,
                    sameProfile(resolvedActiveProfile, user, user.id) && styles.avatarCircleActive,
                    profileMode === 'compare' && selectedForComparison.some((p) => sameProfile(p, user, user.id)) && styles.avatarCircleCompare,
                  ]}>
                    {badgeIndex ? (
                      <View style={styles.compareOrderBadge}>
                        <Text style={styles.compareOrderBadgeText}>{badgeIndex}</Text>
                      </View>
                    ) : null}
                    <Text style={[
                      styles.avatarInitials,
                      sameProfile(resolvedActiveProfile, user, user.id) && styles.avatarInitialsActive,
                    ]}>
                      {getAvatarInitials(getProfileName(user))}
                    </Text>
                  </View>
                );
              })()}
              <Text style={styles.profilePillLabel}>Ben</Text>
            </Pressable>
          )}

          {savedPeople.map((person) => {
            const isActive = sameProfile(resolvedActiveProfile, person, user?.id);
            const isSelectedForCompare = selectedForComparison.some((p) => sameProfile(p, person, user?.id));
            const selectionBadge = profileMode === 'compare' ? getComparisonBadgeIndex(person) : null;

            return (
              <Pressable
                key={`saved-person-${person.id}`}
                style={styles.profilePill}
                onPress={() => handleSavedAvatarPress(person)}
                onLongPress={() => handleSavedAvatarLongPress(person)}
                delayLongPress={320}
                accessibilityRole="button"
                accessibilityLabel={`${person.name} profilini seç`}
              >
                <View style={[
                  styles.avatarCircle,
                  isActive && styles.avatarCircleActive,
                  isSelectedForCompare && styles.avatarCircleCompare,
                ]}>
                  {selectionBadge ? (
                    <View style={styles.compareOrderBadge}>
                      <Text style={styles.compareOrderBadgeText}>{selectionBadge}</Text>
                    </View>
                  ) : null}
                  <Text style={[
                    styles.avatarInitials,
                    isActive && styles.avatarInitialsActive,
                  ]}>
                    {getAvatarInitials(person.name)}
                  </Text>
                </View>
                <Text style={styles.profilePillLabel} numberOfLines={1}>
                  {person.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          style={styles.profilePill}
          onPress={openAddCompanionModal}
          accessibilityRole="button"
          accessibilityLabel="Kişi ekle"
        >
          <View style={styles.addAvatarCircle}>
            <Plus size={18} color="#5B4ACB" />
          </View>
          <Text style={styles.profilePillLabel}>Kişi Ekle</Text>
        </Pressable>
      </View>
    </View>
  );

  const MainVerticalScroll: any = ENABLE_SECTION_DND ? NestableScrollContainer : ScrollView;
  const stickyHeaderIndices = chart ? [1] : [];

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={styles.container}>
      <View style={styles.readyLayout}>
        <MainVerticalScroll
          ref={mainScrollRef}
          style={styles.scroll}
          onLayout={(event: any) => {
            const h = event?.nativeEvent?.layout?.height;
            if (typeof h === 'number' && h > 0) {
              setMainScrollViewportHeight((prev) => (Math.abs(prev - h) > 2 ? h : prev));
            }
          }}
          contentContainerStyle={styles.scrollContent}
          stickyHeaderIndices={stickyHeaderIndices}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={handleNatalScroll}
          onScrollEndDrag={handleNatalScrollEndDrag}
          onMomentumScrollEnd={handleNatalMomentumScrollEnd}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.violet}
              colors={[colors.violet]}
            />
          }
        >
        <Reanimated.View
          style={[styles.fixedTopStack, !profileSwitcherVisible && styles.fixedTopStackHidden]}
          pointerEvents={profileSwitcherVisible ? 'auto' : 'none'}
        >
          {renderProfileSwitcherCard()}
        </Reanimated.View>

        {!!chart && (
          <View
            style={styles.stickyHeroHeaderShell}
            onLayout={(event) => setStickyHeroHeight(event.nativeEvent.layout.height)}
          >
            <View style={styles.fixedHeroContainer}>
              <NatalChartHeroCard
                name={activeProfileName || chart.name}
                birthDate={String(chart.birthDate)}
                birthTime={chart.birthTime}
                birthLocation={chart.birthLocation}
                sunSign={chart.sunSign}
                moonSign={chart.moonSign}
                risingSign={chart.risingSign}
                planets={chart.planets ?? []}
                houses={chart.houses ?? []}
                aspects={chart.aspects ?? []}
                planetNames={planetNames}
                showWheelPreview={false}
                expanded={heroInfoExpanded}
                onToggleExpanded={() => setHeroInfoExpanded((prev) => !prev)}
                onBigThreePress={handleHeroBigThreePress}
                onMetricPress={handleHeroMetricPress}
              />
            </View>
          </View>
        )}

        {profileMode === 'compare' && (
          <View style={styles.compareCard}>
            <View style={styles.compareHeader}>
              <View style={styles.compareHeaderLeft}>
                <Users size={16} color="#3B82F6" />
                <Text style={styles.compareTitle}>Sinastri Atölyesi</Text>
              </View>
              {selectedForComparison.length > 0 ? (
                <Pressable onPress={clearComparisonSelection} style={styles.compareClearBtn}>
                  <X size={14} color={colors.muted} />
                  <Text style={styles.compareClearText}>Temizle</Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.compareHint}>
              {comparisonPair
                ? 'Dual chart görünümü hazır. İstersen AI uyum analizini başlat.'
                : selectedForComparison.length === 1
                  ? 'İkinci profili seçerek karşılaştırmayı tamamla.'
                : 'Yukarıdaki listeden iki profil seç. Uzun basarak kayıtlı kişiyi düzenleyebilir veya silebilirsin.'}
            </Text>

            {comparisonPair ? (
              <>
                <View style={styles.dualChartRow}>
                  {comparisonPair.map((profileItem, idx) => {
                    const pChart = isSavedPersonProfile(profileItem)
                      ? savedPersonToChart(profileItem)
                      : (cachedChart ?? chart);
                    const pSun = getZodiacInfo(pChart?.sunSign);
                    const pMoon = getZodiacInfo(pChart?.moonSign);
                    const pRise = getZodiacInfo(pChart?.risingSign);
                    return (
                      <View key={profileKey(profileItem, user?.id) ?? `compare-${idx}`} style={styles.dualChartPanel}>
                        <Text style={styles.dualChartName} numberOfLines={1}>
                          {getProfileName(profileItem)}
                        </Text>
                        <Text style={styles.dualChartMeta} numberOfLines={1}>
                          {[
                            isSavedPersonProfile(profileItem)
                              ? relationshipLabel(profileItem.relationshipType)
                              : 'SELF',
                            genderLabel((profileItem as any)?.gender),
                          ].filter(Boolean).join(' • ')}
                        </Text>
                        <View style={styles.dualChartSigns}>
                          <Text style={styles.dualChartSignLine}>{pSun.symbol} {pSun.name}</Text>
                          <Text style={styles.dualChartSignLine}>{pMoon.symbol} {pMoon.name}</Text>
                          <Text style={styles.dualChartSignLine}>{pRise.symbol} {pRise.name}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.compareActionsRow}>
                  <Pressable
                    style={[styles.compareRunBtn, !canRunSynastry && styles.compareRunBtnDisabled]}
                    onPress={handleRunComparison}
                    disabled={!canRunSynastry || isAnalyzingSynastry}
                  >
                    {isAnalyzingSynastry ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Sparkles size={15} color="#FFFFFF" />
                    )}
                    <Text style={styles.compareRunBtnText}>
                      {isAnalyzingSynastry ? 'Analiz Hazırlanıyor…' : 'AI Karşılaştır'}
                    </Text>
                  </Pressable>
                </View>

                {!canRunSynastry && (
                  <Text style={styles.compareLimitText}>
                    Karşılaştırma için en az bir kayıtlı kişi seçmelisiniz.
                  </Text>
                )}

                {comparisonResult && comparisonOverallScore != null && (
                  <MatchResultScreen
                    matchId={comparisonResult.id}
                    compatibilityScore={comparisonOverallScore}
                    relationLabel={comparisonRelationLabel}
                    relationshipType={comparisonRelationshipType}
                    scoreBreakdown={comparisonResult.scoreBreakdown ?? null}
                    displayMetrics={comparisonResult.displayMetrics ?? null}
                    personAName={comparisonPersonAName}
                    personBName={comparisonPersonBName}
                    personASignLabel={comparisonPersonASignLabel}
                    personBSignLabel={comparisonPersonBSignLabel}
                    aspectsCount={comparisonAspectsCount}
                    fallbackInsight={comparisonResult.harmonyInsight}
                    onCreateCard={openMatchCardPreview}
                    createCardDisabled={comparisonOverallScore == null}
                  />
                )}

                {comparisonResult && comparisonAChart && comparisonBChart ? (
                  <SynastryProPanel
                    result={comparisonResult}
                    personAName={comparisonPersonAName}
                    personBName={comparisonPersonBName}
                    personAChart={comparisonAChart}
                    personBChart={comparisonBChart}
                    relationLabel={comparisonRelationLabel}
                    relationshipType={comparisonRelationshipType}
                  />
                ) : null}
              </>
            ) : null}
          </View>
        )}

        <Reanimated.View
          key={profileKey(resolvedActiveProfile, user?.id) ?? 'active-profile'}
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(160)}
          style={{ gap: 20 }}
        >
          {ENABLE_SECTION_DND ? (
            <NestableDraggableFlatList
              data={visibleDraggableSectionKeys}
              keyExtractor={(item) => item}
              renderItem={renderDraggableAccordionItem}
              onDragEnd={({ data }) => handleSectionReorder(data)}
              activationDistance={10}
              containerStyle={styles.draggableSectionsList}
              contentContainerStyle={styles.draggableSectionsContent}
            />
          ) : (
            <View
              style={styles.draggableSectionsContent}
              onLayout={(event) => {
                accordionListBaseYRef.current = event.nativeEvent.layout.y;
              }}
            >
              {visibleDraggableSectionKeys.map((item) => (
                <View
                  key={`static-section-${item}`}
                  ref={(node) => {
                    accordionItemRefsRef.current[item] = node;
                  }}
                  collapsable={false}
                  style={styles.draggableSectionItemWrap}
                  onLayout={(event) => {
                    const { y, height } = event.nativeEvent.layout;
                    registerAccordionItemWrapperLayout(item, y, height);
                  }}
                >
                  {renderAccordionSectionByKey(item, () => {}, false)}
                </View>
              ))}
            </View>
          )}

        <Pressable
          style={styles.refreshBtn}
          onPress={() => loadChart(true)}
          accessibilityLabel={t('natalChart.refreshChart')}
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={16} color={colors.violet} />
          <Text style={styles.refreshBtnText}>
            {activeProfileIsSaved ? 'Profili Yenile' : 'Haritami Yenile'}
          </Text>
        </Pressable>
        </Reanimated.View>
        </MainVerticalScroll>
      </View>

      <Modal
        visible={companionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeCompanionModal}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={closeCompanionModal} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalSheetWrapper}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalSheetHandle} />
              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalTitle}>
                    {editingCompanion ? 'Kişiyi Düzenle' : 'Kişi Ekle'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Kaydettiğiniz anda yüksek hassasiyetli harita hesaplaması yapılır.
                  </Text>
                </View>
                <Pressable style={styles.modalIconBtn} onPress={closeCompanionModal}>
                  <X size={18} color={colors.muted} />
                </Pressable>
              </View>

              <ScrollView
                ref={companionFormScrollRef}
                style={styles.modalFormScroll}
                contentContainerStyle={styles.modalFormContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                onLayout={(event) => setCompanionFormViewportHeight(event.nativeEvent.layout.height)}
              >
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>İsim</Text>
                  <View style={styles.fieldInputRow}>
                    <Pencil size={16} color={colors.muted} />
                    <TextInput
                      style={styles.fieldTextInput}
                      placeholder="Örn: Ayşe Yılmaz"
                      placeholderTextColor={colors.disabledText}
                      value={companionForm.name}
                      onChangeText={(value) => setCompanionForm((prev) => ({ ...prev, name: value }))}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>İlişki Türü</Text>
                  <View style={styles.relationshipChipWrap}>
                    {RELATIONSHIP_OPTIONS.map((option) => {
                      const selected = companionForm.relationshipType === option.key;
                      return (
                        <Pressable
                          key={option.key}
                          style={[styles.relationshipChip, selected && styles.relationshipChipActive]}
                          onPress={() => setCompanionForm((prev) => ({ ...prev, relationshipType: option.key }))}
                        >
                          <Text style={[styles.relationshipChipText, selected && styles.relationshipChipTextActive]}>
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Cinsiyet (Opsiyonel)</Text>
                  <View style={styles.relationshipChipWrap}>
                    {GENDER_OPTIONS.map((option) => {
                      const selected = companionForm.gender === option.key;
                      return (
                        <Pressable
                          key={option.key}
                          style={[styles.relationshipChip, selected && styles.relationshipChipActive]}
                          onPress={() =>
                            setCompanionForm((prev) => ({
                              ...prev,
                              gender: prev.gender === option.key ? undefined : option.key,
                            }))
                          }
                        >
                          <Text style={[styles.relationshipChipText, selected && styles.relationshipChipTextActive]}>
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.fieldHint}>
                    Karşılaştırma yorumlarında hitap tonu ve ilişki bağlamını iyileştirmek için kullanılır.
                  </Text>
                </View>

                <View style={styles.fieldRow}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Doğum Tarihi</Text>
                    <Pressable style={styles.pickerField} onPress={() => openNativePicker('date')}>
                      <Calendar size={16} color={colors.muted} />
                      <Text style={[
                        styles.pickerFieldText,
                        !companionForm.birthDateValue && styles.pickerFieldPlaceholder,
                      ]}>
                        {formatDateForDisplay(companionForm.birthDateValue, i18n.language)}
                      </Text>
                      <Text style={styles.pickerFieldAction}>Seç</Text>
                    </Pressable>
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Doğum Saati</Text>
                    <Pressable style={styles.pickerField} onPress={() => openNativePicker('time')}>
                      <Clock3 size={16} color={colors.muted} />
                      <Text style={[
                        styles.pickerFieldText,
                        !companionForm.birthTimeValue && styles.pickerFieldPlaceholder,
                      ]}>
                        {formatTimeForDisplay(companionForm.birthTimeValue, i18n.language)}
                      </Text>
                      <Text style={styles.pickerFieldAction}>Seç</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  {companionUseGooglePlaces ? (
                    <>
                      <View style={styles.fieldInputRow}>
                        <MapPin size={16} color={colors.muted} />
                        <TextInput
                          style={styles.fieldTextInput}
                          placeholder="Şehir, ülke veya tam adres"
                          placeholderTextColor={colors.disabledText}
                          selectionColor={colors.violet}
                          value={placeQuery}
                          onChangeText={(value) => {
                            setPlaceQuery(value);
                            setCompanionForm((prev) => ({
                              ...prev,
                              birthLocation: value,
                              latitude: undefined,
                              longitude: undefined,
                              timezone: undefined,
                            }));
                          }}
                        />
                        {(placeSearchLoading || placeSelecting) ? (
                          <ActivityIndicator size="small" color={colors.violet} />
                        ) : (
                          <Search size={15} color={colors.muted} />
                        )}
                      </View>

                      {placeSuggestions.length > 0 && (
                        <View style={styles.suggestionList}>
                          {placeSuggestions.map((suggestion) => (
                            <Pressable
                              key={suggestion.placeId}
                              style={styles.suggestionItem}
                              onPress={() => handleSelectPlaceSuggestion(suggestion)}
                            >
                              <MapPin size={14} color="#64748B" />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.suggestionPrimary}>{suggestion.primaryText}</Text>
                                {suggestion.secondaryText ? (
                                  <Text style={styles.suggestionSecondary} numberOfLines={1}>
                                    {suggestion.secondaryText}
                                  </Text>
                                ) : null}
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      <View style={styles.locationSelectionCard}>
                        <View style={styles.locationSelectionHeader}>
                          <Text style={styles.locationSelectionTitle}>Konum Seçimi</Text>
                          <Text style={styles.locationSelectionSub}>
                            Ülke, şehir ve ilçe adımlarını aşağıdan seç.
                          </Text>
                        </View>

                        <Pressable
                          style={styles.locationStepCard}
                          onPress={() => openFallbackLocationPicker('country')}
                        >
                          <View style={styles.locationStepLeft}>
                            <View style={styles.locationStepIconBadge}>
                              <MapPin size={14} color="#5B4ACB" />
                            </View>
                            <View style={styles.locationStepTextCol}>
                              <Text style={styles.locationStepLabel}>Ülke</Text>
                              <Text style={styles.locationStepValue} numberOfLines={1}>
                                {companionForm.countryCode ? getCountryNameByCode(companionForm.countryCode) : 'Ülke seç'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.locationStepAction}>Değiştir</Text>
                        </Pressable>

                        <View style={styles.locationStepRow}>
                          <Pressable
                            style={[styles.locationStepCard, styles.locationStepCardHalf]}
                            onPress={() => openFallbackLocationPicker('city')}
                          >
                            <View style={styles.locationStepLeft}>
                              <View style={styles.locationStepIconBadge}>
                                <MapPin size={13} color="#5B4ACB" />
                              </View>
                              <View style={styles.locationStepTextCol}>
                                <Text style={styles.locationStepLabel}>İl / Şehir</Text>
                                <Text
                                  style={[
                                    styles.locationStepValue,
                                    !companionForm.city && styles.locationStepPlaceholder,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {companionForm.city || 'Seçilmedi'}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.locationStepAction}>Seç</Text>
                          </Pressable>

                          <Pressable
                            style={[
                              styles.locationStepCard,
                              styles.locationStepCardHalf,
                              !companionForm.city && styles.locationStepCardDisabled,
                            ]}
                            onPress={() => openFallbackLocationPicker('district')}
                            disabled={!companionForm.city}
                          >
                            <View style={styles.locationStepLeft}>
                              <View style={styles.locationStepIconBadge}>
                                <MapPin size={13} color="#5B4ACB" />
                              </View>
                              <View style={styles.locationStepTextCol}>
                                <Text style={styles.locationStepLabel}>İlçe</Text>
                                <Text
                                  style={[
                                    styles.locationStepValue,
                                    !companionForm.district && styles.locationStepPlaceholder,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {companionForm.district || (companionForm.city ? 'Seçilmedi' : 'Önce il seç')}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.locationStepAction}>Seç</Text>
                          </Pressable>
                        </View>

                        <View style={styles.locationSelectionSummaryBox}>
                          <View style={styles.locationSummaryHeader}>
                            <MapPin size={14} color="#64748B" />
                            <Text style={styles.locationSummaryTitle}>Seçilen Konum</Text>
                          </View>
                          <Text
                            style={[
                              styles.locationSummaryValue,
                              !composeFallbackBirthLocation(companionForm) && styles.locationSummaryPlaceholder,
                            ]}
                          >
                            {composeFallbackBirthLocation(companionForm) || 'Önce ülke ve şehir seçimi yap'}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}

                  {(companionForm.latitude != null && companionForm.longitude != null) || companionForm.timezone ? (
                    <View style={styles.metaPillRow}>
                      {companionForm.latitude != null && companionForm.longitude != null ? (
                        <View style={styles.metaPill}>
                          <Check size={12} color="#0F766E" />
                          <Text style={styles.metaPillText}>
                            {companionForm.latitude.toFixed(4)}, {companionForm.longitude.toFixed(4)}
                          </Text>
                        </View>
                      ) : null}
                      {companionForm.timezone ? (
                        <View style={styles.metaPill}>
                          <Check size={12} color="#0F766E" />
                          <Text style={styles.metaPillText}>{companionForm.timezone}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {!companionUseGooglePlaces && locationPickerTarget ? (
                    <View
                      style={styles.locationPickerInlineCard}
                      onLayout={(event) => {
                        locationPickerInlineYRef.current = event.nativeEvent.layout.y;
                        if (pendingLocationPickerScrollRef.current) {
                          const ok = scrollToLocationPickerInline(false);
                          if (ok) pendingLocationPickerScrollRef.current = false;
                        }
                      }}
                    >
                      <View style={styles.locationPickerInlineHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.locationPickerInlineTitle}>{locationPickerTitle}</Text>
                          <Text style={styles.locationPickerInlineSubTitle}>
                            {locationPickerTarget === 'district'
                              ? 'İlçeler seçili ile göre listelenir.'
                              : 'Listeden seçim yapın veya arayın.'}
                          </Text>
                        </View>
                        <Pressable style={styles.modalIconBtn} onPress={closeFallbackLocationPicker}>
                          <X size={18} color={colors.muted} />
                        </Pressable>
                      </View>

                      <View style={styles.fieldInputRow}>
                        <Search size={15} color={colors.muted} />
                        <TextInput
                          style={styles.fieldTextInput}
                          placeholder="Ara..."
                          placeholderTextColor={colors.disabledText}
                          selectionColor={colors.violet}
                          value={locationPickerQuery}
                          onChangeText={setLocationPickerQuery}
                        />
                      </View>

                      <ScrollView
                        style={styles.locationPickerList}
                        contentContainerStyle={styles.locationPickerListContent}
                        keyboardShouldPersistTaps="always"
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                      >
                        {locationPickerItems.length === 0 ? (
                          <View style={styles.locationPickerEmpty}>
                            <Text style={styles.locationPickerEmptyText}>
                              {locationPickerTarget === 'district' && !companionForm.city
                                ? 'Önce il/şehir seçin.'
                                : 'Kayıt bulunamadı.'}
                            </Text>
                          </View>
                        ) : (
                          locationPickerItems.map((item) => (
                            <Pressable
                              key={`${locationPickerTarget}-${item.key}`}
                              style={styles.locationPickerItem}
                              onPress={() => applyFallbackLocationSelection(item.value)}
                            >
                              <Text style={styles.locationPickerItemText}>{item.label}</Text>
                              {item.subLabel ? (
                                <Text style={styles.locationPickerItemSubText} numberOfLines={1}>
                                  {item.subLabel}
                                </Text>
                              ) : null}
                            </Pressable>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
              </ScrollView>

              {Platform.OS === 'ios' && iosPickerTarget ? (
                <View style={styles.iosPickerDock}>
                  <View style={styles.iosPickerHeader}>
                    <Text style={styles.iosPickerTitle}>
                      {iosPickerTarget === 'date' ? 'Doğum Tarihi' : 'Doğum Saati'}
                    </Text>
                    <View style={styles.iosPickerActions}>
                      <Pressable style={styles.iosPickerBtn} onPress={() => setIosPickerTarget(null)}>
                        <Text style={styles.iosPickerBtnText}>İptal</Text>
                      </Pressable>
                      <Pressable style={[styles.iosPickerBtn, styles.iosPickerBtnPrimary]} onPress={confirmIosPicker}>
                        <Text style={[styles.iosPickerBtnText, styles.iosPickerBtnTextPrimary]}>Tamam</Text>
                      </Pressable>
                    </View>
                  </View>
                  <DateTimePicker
                    value={iosPickerDraftDate}
                    mode={iosPickerTarget}
                    display="spinner"
                    is24Hour
                    themeVariant="light"
                    textColor="#0F172A"
                    onChange={onIosPickerChange}
                    style={styles.iosPickerControl}
                  />
                </View>
              ) : null}

              <View style={styles.modalFooter}>
                <Pressable style={styles.modalSecondaryBtn} onPress={closeCompanionModal}>
                  <Text style={styles.modalSecondaryBtnText}>Vazgeç</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalPrimaryBtn, companionSaving && { opacity: 0.7 }]}
                  onPress={handleSaveCompanion}
                  disabled={companionSaving}
                >
                  {companionSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Plus size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.modalPrimaryBtnText}>
                    {editingCompanion ? 'Güncelle' : 'Kaydet'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Planet Bottom Sheet */}
      <PlanetBottomSheet
        visible={sheetVisible}
        planet={selectedPlanet}
        insight={selectedPlanet ? (chart?.planetComboInsights ?? []).find(
          (item) =>
            item.planet === selectedPlanet.planet &&
            item.house === selectedPlanet.house &&
            item.sign === selectedPlanet.sign,
        ) ?? null : null}
        onClose={closePlanetSheet}
      />

      {/* Aspect Bottom Sheet */}
      <AspectBottomSheet
        visible={aspectSheetVisible}
        aspect={selectedAspect}
        onClose={closeAspectSheet}
      />

      <HouseBottomSheet
        visible={houseSheetVisible}
        house={selectedHouse}
        planetsInHouse={selectedHouse ? (chart?.planets ?? []).filter((p) => p.house === selectedHouse.houseNumber) : []}
        insight={selectedHouse ? (chart?.houseComboInsights ?? []).find((item) => item.houseNumber === selectedHouse.houseNumber) ?? null : null}
        onClose={closeHouseSheet}
      />

      <BigThreeBottomSheet
        visible={bigThreeSheetVisible}
        role={selectedBigThreeRole}
        sign={selectedBigThreeRole ? bigThreeSignByRole[selectedBigThreeRole] : null}
        onClose={closeBigThreeSheet}
      />
    </SafeScreen>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES — Modern Light Theme
// ═══════════════════════════════════════════════════════════════════════
function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  readyLayout: {
    flex: 1,
    backgroundColor: C.bg,
  },
  fixedTopStack: {
    paddingTop: 2,
    paddingBottom: 8,
    gap: 10,
  },
  fixedTopStackHidden: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
    paddingTop: 0,
    paddingBottom: 0,
    gap: 0,
  },
  stickyHeroHeaderShell: {
    backgroundColor: C.bg,
    paddingBottom: 10,
    zIndex: 3,
  },
  fixedHeroContainer: {
    backgroundColor: C.bg,
    gap: 8,
  },
  heroToggleCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  heroToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroToggleTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  heroToggleEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroToggleTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  heroToggleSub: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
  heroToggleBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: (Platform.OS === 'ios' ? 88 : 68) + 32,
    gap: 16,
  },
  draggableSectionsList: {
    flexGrow: 0,
  },
  draggableSectionsContent: {
    gap: 12,
  },
  draggableSectionItemWrap: {
    borderRadius: 18,
  },
  draggableSectionItemWrapActive: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  sectionDragHandle: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
  },
  sectionDragHandleActive: {
    backgroundColor: 'rgba(91,74,203,0.10)',
    borderColor: 'rgba(91,74,203,0.22)',
  },

  // ── Multi-profile / comparison header ────────────────────────────
  profileSwitcherCard: {
    backgroundColor: '#FCFCFE',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EBF3',
    padding: 14,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  profileSwitcherHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  profileSwitcherHeaderTextCol: {
    flex: 1,
    minWidth: 0,
  },
  profileSwitcherTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileSwitcherSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  profileSwitcherMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileMetaTag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  profileMetaTagActive: {
    borderColor: '#D9D3FF',
    backgroundColor: '#F3F0FF',
  },
  profileMetaTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  profileMetaTagTextActive: {
    color: '#5B4ACB',
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  modeChipActive: {
    borderColor: '#CFC5FF',
    backgroundColor: '#F2EEFF',
  },
  modeChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  modeChipTextActive: {
    color: '#5B4ACB',
  },
  profileScrollerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  profileScroller: {
    flex: 1,
  },
  profileScrollerContent: {
    paddingRight: 10,
    gap: 10,
  },
  profilePill: {
    width: 80,
    alignItems: 'center',
    gap: 7,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F7FF',
    borderWidth: 1,
    borderColor: '#DDE4F2',
  },
  avatarCircleActive: {
    backgroundColor: '#F1EEFF',
    borderColor: '#CDC6FF',
  },
  avatarCircleCompare: {
    borderColor: '#E3A008',
    borderWidth: 1.5,
  },
  compareOrderBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#5B4ACB',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  compareOrderBadgeText: {
    fontSize: 10,
    lineHeight: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addAvatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D9D3FF',
    backgroundColor: '#F6F3FF',
    borderStyle: 'dashed',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  avatarInitialsActive: {
    color: '#4338CA',
  },
  profilePillLabel: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  compareCard: {
    backgroundColor: '#FCFDFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EDF6',
    padding: 14,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  compareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compareHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compareTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  compareClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compareClearText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  compareHint: {
    fontSize: 11.5,
    lineHeight: 17,
    color: '#66758A',
  },
  dualChartRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dualChartPanel: {
    flex: 1,
    backgroundColor: '#F7F9FD',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5EAF3',
    padding: 11,
    gap: 6,
  },
  dualChartName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  dualChartMeta: {
    fontSize: 10,
    color: '#7C3AED',
    fontWeight: '700',
  },
  dualChartSigns: {
    gap: 2,
    marginTop: 4,
  },
  dualChartSignLine: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },
  compareActionsRow: {
    marginTop: 4,
  },
  compareRunBtn: {
    backgroundColor: '#1F2A44',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#2D3B5C',
  },
  compareRunBtnDisabled: {
    opacity: 0.55,
  },
  compareRunBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  compareLimitText: {
    fontSize: 11,
    color: '#92400E',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  // ── Companion form modal ─────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.20)',
  },
  modalBackdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheetWrapper: {
    width: '100%',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: '86%',
    gap: 12,
  },
  modalSheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    marginBottom: 4,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 17,
  },
  modalIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFormScroll: {
    flexGrow: 0,
  },
  modalFormContent: {
    gap: 14,
    paddingBottom: 4,
  },
  locationPickerInlineCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 10,
  },
  locationFormInfoCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EBF3',
    backgroundColor: '#F8FAFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  locationFormInfoTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  locationFormInfoSub: {
    fontSize: 11.5,
    lineHeight: 16,
    color: '#64748B',
  },
  locationSelectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7EBF3',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 10,
  },
  locationSelectionHeader: {
    gap: 2,
  },
  locationSelectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  locationSelectionSub: {
    fontSize: 11,
    lineHeight: 15,
    color: '#64748B',
  },
  locationStepRow: {
    flexDirection: 'row',
    gap: 8,
  },
  locationStepCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6EAF2',
    backgroundColor: '#FBFCFF',
    minHeight: 54,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationStepCardHalf: {
    flex: 1,
  },
  locationStepCardDisabled: {
    opacity: 0.5,
  },
  locationStepLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationStepIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F0FF',
    borderWidth: 1,
    borderColor: '#DDD5FF',
    flexShrink: 0,
  },
  locationStepTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  locationStepLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  locationStepValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  locationStepPlaceholder: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  locationStepAction: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5B4ACB',
    flexShrink: 0,
  },
  locationSelectionSummaryBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    backgroundColor: '#F8FAFF',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 5,
  },
  locationSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationSummaryTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  locationSummaryValue: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  locationSummaryPlaceholder: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  locationPickerInlineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  locationPickerInlineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  locationPickerInlineSubTitle: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    color: '#64748B',
  },
  locationPickerList: {
    flexGrow: 0,
    maxHeight: 240,
  },
  locationPickerListContent: {
    gap: 8,
    paddingBottom: 6,
  },
  locationPickerItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  locationPickerItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  locationPickerItemSubText: {
    fontSize: 11,
    color: '#64748B',
  },
  locationPickerEmpty: {
    minHeight: 76,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  locationPickerEmptyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  fieldGroup: {
    gap: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  fieldInputRow: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerField: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#D7DDE8',
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  pickerFieldDisabled: {
    opacity: 0.45,
  },
  pickerFieldText: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 10,
    fontWeight: '600',
  },
  pickerFieldPlaceholder: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  pickerFieldAction: {
    fontSize: 11,
    color: '#5B4ACB',
    fontWeight: '700',
  },
  fieldTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 10,
  },
  readonlyLocationText: {
    color: '#334155',
  },
  fieldHint: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  relationshipChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relationshipChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  relationshipChipActive: {
    backgroundColor: '#F3F0FF',
    borderColor: '#D9D3FF',
  },
  relationshipChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  relationshipChipTextActive: {
    color: '#5B4ACB',
  },
  suggestionList: {
    marginTop: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  suggestionSecondary: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  metaPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F766E',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 4,
  },
  iosPickerDock: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    marginTop: 2,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  iosPickerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  iosPickerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iosPickerBtn: {
    minHeight: 30,
    borderRadius: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iosPickerBtnPrimary: {
    backgroundColor: '#F3F0FF',
    borderColor: '#D9D3FF',
  },
  iosPickerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  iosPickerBtnTextPrimary: {
    color: '#5B4ACB',
  },
  iosPickerControl: {
    alignSelf: 'stretch',
    backgroundColor: '#F8FAFC',
  },
  modalSecondaryBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalPrimaryBtn: {
    flex: 1.2,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#5B4ACB',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#5B4ACB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 2,
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Center states (loading / calculating / error)
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  skelLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: C.violetBg,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.muted,
    marginTop: 4,
  },
  calcSymbol: {
    fontSize: 48,
    marginBottom: 8,
    color: C.violet,
  },
  calcTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  calcSub: {
    fontSize: 13,
    color: C.muted,
  },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.redLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: C.body,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.violet,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 8,
  },
  retryBtnText: {
    color: C.white,
    fontWeight: '600',
    fontSize: 14,
  },

  // ── Header Card ──────────────────────────────────────────────────
  headerCard: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 4,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.violet,
    marginTop: 2,
  },
  headerSub: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },

  posterAccordionInner: {
    gap: 12,
  },
  posterPreviewHint: {
    fontSize: 12,
    lineHeight: 18,
    color: C.muted,
  },
  posterPreviewShell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterPreviewViewport: {
    width: 290,
    height: 516,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#02040A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterPreviewScaled: {
    width: 360,
    height: 640,
    transform: [{ scale: 0.805 }],
  },
  posterModuleActions: {
    marginTop: 2,
  },

  // ── Big Three Trinity ─────────────────────────────────────────────
  trinityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  trinityBubble: {
    flex: 1,
    backgroundColor: C.violetBg,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  trinityBubblePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  trinityIcon: {
    fontSize: 22,
    color: C.violetText,
  },
  trinitySign: {
    fontSize: 13,
    fontWeight: '700',
    color: C.violetText,
    textAlign: 'center',
  },
  trinityLabel: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '500',
  },
  trinityHint: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    color: C.violet,
  },

  // ── Sections ──────────────────────────────────────────────────────
  section: {
    gap: 12,
  },
  hotspotRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },

  // ── Planet Rows ───────────────────────────────────────────────────
  planetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 14,
    gap: 12,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  planetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.violetBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planetIcon: {
    fontSize: 20,
    color: C.violet,
  },
  planetInfo: {
    flex: 1,
    gap: 2,
  },
  planetName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  planetSign: {
    fontSize: 12,
    color: C.muted,
  },
  planetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  houseBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.violetBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  houseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.violet,
  },
  retroBadge: {
    backgroundColor: C.amberLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  retroText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.amber,
  },

  // ── Aspects ───────────────────────────────────────────────────────
  aspectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  aspectTag: {
    backgroundColor: C.card,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 2,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    minWidth: 82,
  },
  aspectPlanets: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    letterSpacing: 1,
  },
  aspectLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  aspectOrb: {
    fontSize: 9,
    color: C.muted,
  },

  // ── House Grid ────────────────────────────────────────────────────
  houseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  houseCell: {
    width: '31%' as any,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  houseCellPressed: {
    opacity: 0.92,
    borderColor: C.violet + '55',
    backgroundColor: C.surfaceAlt,
  },
  houseNumCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.violetBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  houseNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.violet,
  },
  houseSign: {
    fontSize: 12,
    fontWeight: '600',
    color: C.text,
    textAlign: 'center',
  },
  houseDeg: {
    fontSize: 10,
    color: C.muted,
  },
  houseShortDesc: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
    color: C.muted,
    textAlign: 'center',
  },

  // ── AI Card ───────────────────────────────────────────────────────
  aiCard: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  aiAccordionContent: {
    gap: 12,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiText: {
    fontSize: 14,
    color: C.body,
    lineHeight: 22,
  },
  aiStatus: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  aiStatusText: {
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  retrySmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: C.violetBg,
    marginTop: 4,
  },
  retrySmallText: {
    fontSize: 12,
    color: C.violet,
    fontWeight: '600',
  },

  // ── Refresh Button ────────────────────────────────────────────────
  posterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.goldLight,
    backgroundColor: C.primaryTint,
  },
  posterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.goldDark,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: C.violet,
    backgroundColor: 'transparent',
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.violet,
  },
});
}
