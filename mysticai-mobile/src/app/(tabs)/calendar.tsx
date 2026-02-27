import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import axios from 'axios/dist/browser/axios.cjs';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { SafeScreen, TabHeader } from '../../components/ui';
import { useTabHeaderActions } from '../../hooks/useTabHeaderActions';
import { ThemeColors, useTheme } from '../../context/ThemeContext';
import { COSMIC_DOCK_LABEL_OVERRIDE_KEYS, PLANNER_LOCAL_TO_COSMIC_CATEGORY } from '../../constants/CosmicConstants';
import {
  PlannerCategory,
  PlannerCategoryAction,
  PlannerFullDistributionResponse,
  fetchPlannerFullDistribution,
} from '../../services/lucky-dates.service';
import {
  CosmicCategoryDetail,
  CosmicCategoryDetailsResponse,
  CosmicDayDetailResponse,
  CosmicLegendItem,
  CosmicPlannerDay,
  CosmicPlannerResponse,
  fetchCosmicCategoryDetails,
  fetchCosmicPlanner,
} from '../../services/cosmic.service';
import { useAuthStore } from '../../store/useAuthStore';
import { useNatalChartStore } from '../../store/useNatalChartStore';
import {
  PlannerCategoryDefinition,
  PlannerCategoryId,
  PlannerInsight,
  PlannerTone,
  buildPersonalizedCategories,
  buildPlannerInsight,
  getBackendWindowEndDate,
  toDateKey,
} from '../../features/planner/plannerEngine';
import { usePlannerPreferencesStore } from '../../store/usePlannerPreferencesStore';

const INITIAL_BACKEND_MONTHS_AHEAD = 2;
const UI_FONT = Platform.OS === 'ios' ? 'Poppins' : 'Poppins';
const SCORE_FONT = Platform.OS === 'ios' ? 'Playfair Display' : 'serif';

type PlannerFilter = 'ALL' | PlannerCategoryId;
type InsightByCategory = Partial<Record<PlannerCategoryId, PlannerInsight>>;

interface DaySummary {
  score: number;
  tones: PlannerTone[];
  isPredicted: boolean;
  selectedInsight: PlannerInsight | null;
  topCategory: PlannerCategoryDefinition | null;
}

interface TrendPoint {
  label: string;
  score: number;
}

const BACKEND_CATEGORY_TO_LOCAL: Record<string, PlannerCategoryId> = {
  TRANSIT: 'transit',
  MOON: 'moon',
  DATE: 'date',
  MARRIAGE: 'marriage',
  RELATIONSHIP_HARMONY: 'partnerHarmony',
  FAMILY: 'family',
  FINANCE: 'jointFinance',
  BEAUTY: 'beauty',
  HEALTH: 'health',
  ACTIVITY: 'activity',
  OFFICIAL: 'official',
  SPIRITUAL: 'spiritual',
  COLOR: 'color',
  RECOMMENDATIONS: 'recommendations',
};
const LOCAL_CATEGORY_TO_BACKEND: Partial<Record<PlannerCategoryId, PlannerCategory>> = {
  transit: 'TRANSIT',
  moon: 'MOON',
  date: 'DATE',
  marriage: 'MARRIAGE',
  partnerHarmony: 'RELATIONSHIP_HARMONY',
  family: 'FAMILY',
  jointFinance: 'FINANCE',
  beauty: 'BEAUTY',
  health: 'HEALTH',
  activity: 'ACTIVITY',
  official: 'OFFICIAL',
  spiritual: 'SPIRITUAL',
  color: 'COLOR',
  recommendations: 'RECOMMENDATIONS',
};
const LOCAL_CATEGORY_TO_COSMIC = PLANNER_LOCAL_TO_COSMIC_CATEGORY;
const CORE_SYNC_DOCK_ORDER: PlannerCategoryId[] = [
  'transit',
  'moon',
  'beauty',
  'health',
  'jointFinance',
  'activity',
  'official',
  'partnerHarmony',
  'family',
  'spiritual',
];

function hasBackendActionDetails(action: PlannerCategoryAction | undefined): boolean {
  if (!action) return false;
  if (action.source === 'GRID_ONLY') return false;
  return !!(action.reasoning?.trim() || action.dos?.length || action.donts?.length || action.supportingAspects?.length);
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toIsoDate(date: Date): string {
  return toDateKey(date);
}

function getMonthBounds(date: Date): { startDate: string; endDate: string; monthKey: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    monthKey: toMonthKey(start),
  };
}

function extractLoadedMonthKeys(response: PlannerFullDistributionResponse): string[] {
  return Array.from(
    new Set((response.days ?? []).map((day) => {
      const d = new Date(day.date);
      return toMonthKey(d);
    })),
  );
}

function mergePlannerDistributions(
  prev: PlannerFullDistributionResponse | null,
  next: PlannerFullDistributionResponse,
): PlannerFullDistributionResponse {
  if (!prev) return next;

  const byDate = new Map<string, PlannerFullDistributionResponse['days'][number]>();
  prev.days.forEach((day) => byDate.set(day.date, day));
  next.days.forEach((day) => {
    const existing = byDate.get(day.date);
    if (!existing) {
      byDate.set(day.date, day);
      return;
    }

    const categoriesById = new Map(existing.categories.map((category) => [category.category, category] as const));
    day.categories.forEach((category) => {
      const existingCategory = categoriesById.get(category.category);
      if (
        existingCategory
        && existingCategory.source === 'GRID_ONLY'
        && category.source === 'RULE_ENGINE'
      ) {
        categoriesById.set(category.category, {
          ...category,
          // Keep the grid score stable so the detail panel ratio does not jump
          // when only the textual detail payload is loaded.
          score: existingCategory.score,
        });
        return;
      }
      categoriesById.set(category.category, category);
    });

    const mergedCategories = Array.from(categoriesById.values());
    const overallScore = mergedCategories.length
      ? Math.round(mergedCategories.reduce((sum, item) => sum + item.score, 0) / mergedCategories.length)
      : day.overallScore;

    byDate.set(day.date, {
      ...existing,
      ...day,
      overallScore,
      categories: mergedCategories,
    });
  });

  const mergedDays = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  const startDate = mergedDays[0]?.date ?? next.startDate ?? prev.startDate;
  const endDate = mergedDays[mergedDays.length - 1]?.date ?? next.endDate ?? prev.endDate;

  return {
    ...prev,
    userId: next.userId ?? prev.userId,
    monthsAhead: Math.max(prev.monthsAhead ?? 0, next.monthsAhead ?? 0),
    startDate,
    endDate,
    days: mergedDays,
    generatedAt: next.generatedAt,
  };
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

function buildMonthGrid(viewDate: Date): Date[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7;
  const firstCell = new Date(year, month, 1 - mondayFirstOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);
    return date;
  });
}

function formatDateLabel(date: Date, months: string[]): string {
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getRingColor(score: number): string {
  if (score >= 80) return '#33F4D8';
  if (score >= 50) return '#F3C067';
  return '#8B95A7';
}

function getHeatColor(score: number, isDark: boolean): string {
  if (score >= 80) return isDark ? 'rgba(32,237,196,0.20)' : 'rgba(32,178,170,0.14)';
  if (score >= 50) return isDark ? 'rgba(243,192,103,0.18)' : 'rgba(227,167,77,0.12)';
  return isDark ? 'rgba(130,144,167,0.16)' : 'rgba(148,163,184,0.11)';
}

function getToneDotColor(tone: PlannerTone): string {
  if (tone === 'luck') return '#41E28F';
  if (tone === 'warning') return '#FF6B6B';
  return '#B28DFF';
}

function tonePriority(tone: PlannerTone): number {
  if (tone === 'luck') return 3;
  if (tone === 'spiritual') return 2;
  return 1;
}

function toneFromScore(score: number): PlannerTone {
  if (score >= 85) return 'luck';
  if (score < 58) return 'warning';
  return 'spiritual';
}

function buildActionables(
  t: (key: string, params?: Record<string, any>) => string,
  categoryLabel: string,
  score: number,
): { dos: string[]; donts: string[] } {
  if (score >= 80) {
    return {
      dos: [
        t('calendar.actionTemplates.execute', { category: categoryLabel }),
        t('calendar.actionTemplates.focusBlock', { category: categoryLabel }),
      ],
      donts: [
        t('calendar.actionTemplates.rush', { category: categoryLabel }),
        t('calendar.actionTemplates.scatter', { category: categoryLabel }),
      ],
    };
  }

  if (score >= 50) {
    return {
      dos: [
        t('calendar.actionTemplates.prepare', { category: categoryLabel }),
        t('calendar.actionTemplates.review', { category: categoryLabel }),
      ],
      donts: [
        t('calendar.actionTemplates.overCommit', { category: categoryLabel }),
        t('calendar.actionTemplates.impulse', { category: categoryLabel }),
      ],
    };
  }

  return {
    dos: [
      t('calendar.actionTemplates.observe', { category: categoryLabel }),
      t('calendar.actionTemplates.microStep', { category: categoryLabel }),
    ],
    donts: [
      t('calendar.actionTemplates.signCritical', { category: categoryLabel }),
      t('calendar.actionTemplates.heavyRisk', { category: categoryLabel }),
    ],
  };
}

function buildPlannerInsightFromCosmicDetail(params: {
  categoryDetail: CosmicCategoryDetail;
  moonPhase: string;
  mercuryRetrograde: boolean;
  fallback?: PlannerInsight | null;
}): PlannerInsight {
  const { categoryDetail, moonPhase, mercuryRetrograde, fallback } = params;
  const score = clamp(categoryDetail.score);
  const supportingAspects = (categoryDetail.supportingAspects ?? []).filter(Boolean);
  const signalSeed = Math.max(1, supportingAspects.length);
  const topSub = (categoryDetail.subcategories ?? [])[0];
  const lowSub = (categoryDetail.subcategories ?? []).slice().sort((a, b) => a.score - b.score)[0];

  return {
    score,
    tone: toneFromScore(score),
    source: 'backend',
    reason: categoryDetail.reasoning || topSub?.insight || fallback?.reason || '',
    dos: categoryDetail.dos?.length ? categoryDetail.dos : (fallback?.dos ?? []),
    donts: categoryDetail.donts?.length ? categoryDetail.donts : (fallback?.donts ?? []),
    supportingAspects: supportingAspects.length
      ? supportingAspects
      : [
        ...(topSub?.triggerNotes ?? []),
        ...(lowSub && lowSub !== topSub ? lowSub.triggerNotes ?? [] : []),
      ].filter(Boolean).slice(0, 6),
    mercuryRetrograde,
    moonPhase: moonPhase || fallback?.moonPhase || '',
    signals: {
      transit: clamp(score + signalSeed * 2),
      house: clamp(score - 4 + signalSeed),
      natal: clamp(score - 2 + signalSeed),
    },
  };
}

function iconForCosmicSubcategory(categoryKey: string | null | undefined, subCategoryKey: string): keyof typeof Ionicons.glyphMap {
  const sub = (subCategoryKey ?? '').toLowerCase();
  const cat = (categoryKey ?? '').toLowerCase();

  if (sub.includes('hair_cut')) return 'cut-outline';
  if (sub.includes('skin') || sub.includes('aesthetic') || sub.includes('nail')) return 'sparkles-outline';
  if (sub.includes('hair_reduction')) return 'flash-outline';
  if (sub.includes('diet')) return 'leaf-outline';
  if (sub.includes('treatment') || sub.includes('checkup')) return 'medkit-outline';
  if (sub.includes('operation')) return 'warning-outline';
  if (sub.includes('sport')) return 'fitness-outline';
  if (sub.includes('vacation') || sub.includes('travel')) return 'airplane-outline';
  if (sub.includes('culture_art')) return 'color-palette-outline';
  if (sub.includes('party') || sub.includes('social')) return 'people-outline';
  if (sub.includes('shopping') || sub.includes('big_purchase')) return 'cart-outline';
  if (sub.includes('repair') || sub.includes('renovation')) return 'hammer-outline';
  if (sub.includes('housework') || sub.includes('cleaning') || sub.includes('moving') || sub.includes('decoration') || sub.includes('plant')) return 'home-outline';
  if (sub.includes('investment') || sub.includes('debt') || sub.includes('finance')) return 'wallet-outline';
  if (sub.includes('law') || sub.includes('official_documents') || sub.includes('applications') || sub.includes('public_affairs')) return 'document-text-outline';
  if (sub.includes('meeting') || sub.includes('thesis') || sub.includes('career_education')) return 'briefcase-outline';
  if (sub.includes('new_job') || sub.includes('seniority') || sub.includes('entrepreneurship') || sub.includes('resignation')) return 'business-outline';
  if (sub.includes('worship') || sub.includes('prayer') || sub.includes('ritual') || sub.includes('meditation') || sub.includes('inner_journey')) return 'sparkles-outline';
  if (sub.includes('green') || sub.includes('pink') || sub.includes('yellow') || sub.includes('blue') || sub.includes('purple')) return 'color-fill-outline';
  if (sub.includes('timing') || sub.includes('communication') || sub.includes('energy')) return 'bulb-outline';

  return cat === 'transit'
    ? 'planet-outline'
    : cat === 'moon'
      ? 'moon-outline'
      : cat === 'color'
        ? 'color-palette-outline'
        : 'ellipse-outline';
}

function TrendLineChart({ points, colors }: { points: TrendPoint[]; colors: ThemeColors }) {
  if (!points.length) return null;

  const chartHeight = 92;
  const chartWidth = Math.max(220, Math.min(340, Dimensions.get('window').width - 74));
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : 0;

  return (
    <View style={{ width: chartWidth, marginTop: 10 }}>
      <View style={{ height: chartHeight, position: 'relative' }}>
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceGlass,
          }}
        />

        {points.map((point, index) => {
          const x = index * stepX;
          const y = chartHeight - (point.score / 100) * (chartHeight - 14) - 7;
          const nextPoint = points[index + 1];
          const nextY = nextPoint
            ? chartHeight - (nextPoint.score / 100) * (chartHeight - 14) - 7
            : y;
          const dx = stepX;
          const dy = nextY - y;
          const lineLength = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);

          return (
            <View key={`${point.label}-${index}`} pointerEvents="none">
              {index < points.length - 1 && (
                <View
                  style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: lineLength,
                    height: 2,
                    backgroundColor: colors.primary,
                    opacity: 0.75,
                    transform: [{ rotate: `${angle}rad` }],
                  }}
                />
              )}

              <View
                style={{
                  position: 'absolute',
                  left: x - 5,
                  top: y - 5,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: getRingColor(point.score),
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              />
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        {points.map((point) => (
          <Text
            key={`label-${point.label}`}
            style={{ color: colors.subtext, fontSize: 11, fontFamily: UI_FONT }}
          >
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function CalendarScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const chart = useNatalChartStore((s) => s.chart);

  const hiddenCategoryIds = usePlannerPreferencesStore((s) => s.hiddenCategoryIds);
  const setCategoryVisibility = usePlannerPreferencesStore((s) => s.setCategoryVisibility);

  const [plannerDistribution, setPlannerDistribution] = useState<PlannerFullDistributionResponse | null>(null);
  const [cosmicPlannerByMonth, setCosmicPlannerByMonth] = useState<Record<string, CosmicPlannerResponse>>({});
  const [cosmicDayDetailsByDate, setCosmicDayDetailsByDate] = useState<Record<string, CosmicDayDetailResponse>>({});
  const [failedCosmicDetailKeys, setFailedCosmicDetailKeys] = useState<Record<string, true>>({});
  const [loadedMonthKeys, setLoadedMonthKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewDate, setViewDate] = useState(() => new Date());
  const [activeFilter, setActiveFilter] = useState<PlannerFilter>('ALL');
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [blueprintVisible, setBlueprintVisible] = useState(false);
  const [detailMounted, setDetailMounted] = useState(false);

  const detailProgress = useSharedValue(0);
  const skeletonPulse = useSharedValue(0.72);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingMonthKeysRef = useRef<Set<string>>(new Set());
  const loadingCosmicMonthKeysRef = useRef<Set<string>>(new Set());
  const loadingDetailKeysRef = useRef<Set<string>>(new Set());
  const loadingCosmicDayDetailKeysRef = useRef<Set<string>>(new Set());
  const subCategoryCardLayoutsRef = useRef<Record<string, { y: number; height: number }>>({});
  const subAnalysisBlockOffsetYRef = useRef(0);
  const subAnalysisListOffsetYRef = useRef(0);
  const seenSubCategoryHapticKeysRef = useRef<Set<string>>(new Set());
  const lastSubCategoryHapticAtRef = useRef(0);

  const months = useMemo(() => t('calendar.months').split(','), [t]);
  const shortDays = useMemo(() => t('calendar.shortDays').split(','), [t]);
  const plannerLocale = useMemo(
    () => ((i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase().startsWith('en') ? 'en' : 'tr'),
    [i18n.language, i18n.resolvedLanguage],
  );
  const backendWindowEnd = useMemo(
    () => getBackendWindowEndDate(INITIAL_BACKEND_MONTHS_AHEAD),
    [],
  );

  const hiddenKey = useMemo(() => hiddenCategoryIds.slice().sort().join('|'), [hiddenCategoryIds]);
  const personalization = useMemo(
    () => buildPersonalizedCategories(user, new Set(hiddenCategoryIds)),
    [user?.gender, user?.focusPoint, user?.maritalStatus, hiddenKey],
  );

  const availableCategories = personalization.available;
  const visibleCategories = personalization.visible;
  const visibleDockCategories = useMemo(() => {
    const ordered = CORE_SYNC_DOCK_ORDER
      .map((id) => visibleCategories.find((category) => category.id === id))
      .filter((category): category is PlannerCategoryDefinition => !!category);
    return ordered.length ? ordered : visibleCategories;
  }, [visibleCategories]);
  const interestTagList = useMemo(
    () => Array.from(personalization.interestTags),
    [personalization.interestTags],
  );
  const interestKey = useMemo(
    () => interestTagList.slice().sort().join('|'),
    [interestTagList],
  );

  useEffect(() => {
    const firstVisible = visibleDockCategories[0]?.id ?? visibleCategories[0]?.id;
    if (!firstVisible) return;
    if (activeFilter === 'ALL') {
      setActiveFilter(firstVisible);
      return;
    }
    if (!visibleCategories.some((category) => category.id === activeFilter)) {
      setActiveFilter(firstVisible);
    }
  }, [activeFilter, visibleCategories, visibleDockCategories]);

  const closeDetailPanel = useCallback(() => {
    detailProgress.value = withTiming(0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setDetailMounted(false);
    }, 230);
  }, [detailProgress]);

  const openDetailPanel = useCallback((date: Date) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    setSelectedDate(date);
    setDetailMounted(true);
    detailProgress.value = withTiming(1, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [detailProgress]);

  useEffect(() => () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
  }, []);

  useEffect(() => {
    skeletonPulse.value = withRepeat(
      withTiming(0.34, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(skeletonPulse);
    };
  }, [skeletonPulse]);

  const fetchPlannerChunk = useCallback(async (params: {
    monthsAhead?: number;
    startDate?: string;
    endDate?: string;
    responseMode?: 'GRID_ONLY' | 'FULL';
    categories?: PlannerCategory[];
    replace?: boolean;
    monthKeyHint?: string;
    suppressError?: boolean;
    skipLoadingState?: boolean;
    skipErrorReset?: boolean;
    preferCache?: boolean;
    forceRefresh?: boolean;
  }) => {
    const userId = user?.id;
    if (!userId || !chart) return;

    if (params.monthKeyHint && loadingMonthKeysRef.current.has(params.monthKeyHint)) {
      return;
    }
    if (params.monthKeyHint) {
      loadingMonthKeysRef.current.add(params.monthKeyHint);
    }

    if (!params.skipLoadingState) {
      setIsLoading(true);
    }
    if (!params.skipErrorReset) {
      setError(null);
    }

    try {
      const response = await fetchPlannerFullDistribution({
        userId,
        monthsAhead: params.monthsAhead,
        userGender: user?.gender,
        maritalStatus: user?.maritalStatus,
        locale: plannerLocale,
        responseMode: params.responseMode ?? 'FULL',
        categories: params.categories,
        startDate: params.startDate,
        endDate: params.endDate,
      }, {
        preferCache: params.preferCache,
        forceRefresh: params.forceRefresh,
      });

      setPlannerDistribution((prev) => (
        params.replace ? response.data : mergePlannerDistributions(prev, response.data)
      ));

      const monthKeysFromResponse = extractLoadedMonthKeys(response.data);
      setLoadedMonthKeys((prev) => Array.from(new Set([...prev, ...monthKeysFromResponse])));
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const msg = err.response?.data?.message as string | undefined;
        if (!params.suppressError) {
          if (status === 404 && msg?.includes('Natal chart not found')) {
            setError(t('calendar.errors.natalChartNotFound'));
          } else if (status === 400 || status === 422) {
            setError(msg || t('calendar.errors.invalidRequest'));
          } else {
            setError(t('calendar.errors.serviceUnavailable'));
          }
        }
      } else {
        if (!params.suppressError) {
          setError(t('calendar.errors.connectionError'));
        }
      }
    } finally {
      if (params.monthKeyHint) {
        loadingMonthKeysRef.current.delete(params.monthKeyHint);
      }
      if (!params.skipLoadingState) {
        setIsLoading(false);
      }
    }
  }, [user?.id, user?.gender, chart, plannerLocale, t]);

  const fetchPlannerData = useCallback(async () => {
    setPlannerDistribution(null);
    setCosmicDayDetailsByDate({});
    setFailedCosmicDetailKeys({});
    setLoadedMonthKeys([]);
    loadingMonthKeysRef.current.clear();
    loadingCosmicDayDetailKeysRef.current.clear();

    const currentMonthDate = new Date();
    const nextMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1);
    const currentMonthBounds = getMonthBounds(currentMonthDate);
    const nextMonthBounds = getMonthBounds(nextMonthDate);

    // First render the current month quickly; prefetch the next month in a separate request
    // so we don't hit gateway timeout with a single heavy 2-month computation.
    await fetchPlannerChunk({
      startDate: currentMonthBounds.startDate,
      endDate: currentMonthBounds.endDate,
      responseMode: 'GRID_ONLY',
      replace: true,
      monthKeyHint: currentMonthBounds.monthKey,
    });

    void fetchPlannerChunk({
      startDate: nextMonthBounds.startDate,
      endDate: nextMonthBounds.endDate,
      responseMode: 'GRID_ONLY',
      monthKeyHint: nextMonthBounds.monthKey,
      suppressError: true,
      skipLoadingState: true,
      skipErrorReset: true,
    });
  }, [fetchPlannerChunk]);

  const fetchPlannerMonth = useCallback(async (date: Date) => {
    const { startDate, endDate, monthKey } = getMonthBounds(date);
    if (loadedMonthKeys.includes(monthKey)) return;
    await fetchPlannerChunk({
      startDate,
      endDate,
      responseMode: 'GRID_ONLY',
      monthKeyHint: monthKey,
    });
  }, [fetchPlannerChunk, loadedMonthKeys]);

  const lastFetchKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!chart || !user?.id) return;
    const fetchKey = `${user.id}:${plannerLocale}:${chart.calculatedAt ?? chart.id ?? 'chart'}`;
    if (lastFetchKeyRef.current === fetchKey) return;
    lastFetchKeyRef.current = fetchKey;
    void fetchPlannerData();
  }, [chart, user?.id, plannerLocale, fetchPlannerData]);

  useEffect(() => {
    if (!chart || !user?.id) return;
    if (!plannerDistribution && loadedMonthKeys.length === 0) return;
    const currentMonthKey = toMonthKey(viewDate);
    if (loadedMonthKeys.includes(currentMonthKey)) return;
    void fetchPlannerMonth(viewDate);
  }, [viewDate, loadedMonthKeys, fetchPlannerMonth, chart, user?.id, plannerDistribution]);

  useEffect(() => {
    if (!user?.id || !chart) return;
    const monthKey = toMonthKey(viewDate);
    if (cosmicPlannerByMonth[monthKey]) return;
    if (loadingCosmicMonthKeysRef.current.has(monthKey)) return;
    loadingCosmicMonthKeysRef.current.add(monthKey);

    void fetchCosmicPlanner({
      userId: user.id,
      month: monthKey,
      locale: plannerLocale,
      gender: user.gender,
      maritalStatus: user.maritalStatus,
    }).then((response) => {
      setCosmicPlannerByMonth((prev) => ({ ...prev, [monthKey]: response.data }));
    }).catch(() => {
      // Silent fallback: planner can continue with existing rule-engine visuals.
    }).finally(() => {
      loadingCosmicMonthKeysRef.current.delete(monthKey);
    });
  }, [user?.id, user?.gender, user?.maritalStatus, chart, viewDate, plannerLocale, cosmicPlannerByMonth]);

  const monthCells = useMemo(() => buildMonthGrid(viewDate), [viewDate]);

  const backendInsightsByDate = useMemo<Record<string, Partial<Record<PlannerCategoryId, PlannerCategoryAction>>>>(() => {
    const mapped: Record<string, Partial<Record<PlannerCategoryId, PlannerCategoryAction>>> = {};
    if (!plannerDistribution?.days?.length) return mapped;

    plannerDistribution.days.forEach((day) => {
      const dayMap: Partial<Record<PlannerCategoryId, PlannerCategoryAction>> = {};
      day.categories.forEach((categoryPayload) => {
        const localId = BACKEND_CATEGORY_TO_LOCAL[categoryPayload.category];
        if (!localId) return;
        dayMap[localId] = categoryPayload;
      });
      mapped[toDateKey(day.date)] = dayMap;
    });

    return mapped;
  }, [plannerDistribution]);

  const currentCosmicPlanner = useMemo(
    () => cosmicPlannerByMonth[toMonthKey(viewDate)] ?? null,
    [cosmicPlannerByMonth, viewDate],
  );
  const cosmicPlannerDaysByDate = useMemo<Record<string, CosmicPlannerDay>>(() => {
    const map: Record<string, CosmicPlannerDay> = {};
    currentCosmicPlanner?.days?.forEach((day) => {
      map[toDateKey(day.date)] = day;
    });
    return map;
  }, [currentCosmicPlanner]);
  const activeCosmicCategoryKey = useMemo(
    () => (activeFilter === 'ALL' ? null : (LOCAL_CATEGORY_TO_COSMIC[activeFilter] ?? null)),
    [activeFilter],
  );
  const activeCosmicLegend = useMemo<CosmicLegendItem[]>(
    () => {
      if (!activeCosmicCategoryKey) return [];
      const baseLegend = currentCosmicPlanner?.legendsByCategory?.[activeCosmicCategoryKey] ?? [];
      const selectedDayDots = cosmicPlannerDaysByDate[toDateKey(selectedDate)]?.dotsByCategory?.[activeCosmicCategoryKey] ?? [];
      if (!selectedDayDots.length) return baseLegend;

      const dotOrder = new Map(
        selectedDayDots.map((dot, index) => [dot.subCategoryKey, { score: dot.score, index }] as const),
      );

      return baseLegend.slice().sort((a, b) => {
        const aMeta = dotOrder.get(a.subCategoryKey);
        const bMeta = dotOrder.get(b.subCategoryKey);
        if (aMeta && bMeta) {
          if (bMeta.score !== aMeta.score) return bMeta.score - aMeta.score;
          return aMeta.index - bMeta.index;
        }
        if (aMeta) return -1;
        if (bMeta) return 1;
        return a.label.localeCompare(b.label);
      });
    },
    [currentCosmicPlanner, activeCosmicCategoryKey, cosmicPlannerDaysByDate, selectedDate],
  );

  const getInsightForDate = useCallback((date: Date, category: PlannerCategoryDefinition): PlannerInsight => {
    const dateKey = toDateKey(date);
    const interestTags = new Set(personalization.interestTags);
    const fallbackInsight = buildPlannerInsight({
      date,
      category,
      userId: user?.id,
      interestTags,
      cards: [],
      backendWindowEnd,
      locale: plannerLocale,
    });

    const cosmicCategoryKey = LOCAL_CATEGORY_TO_COSMIC[category.id];
    const cosmicDayDetail = cosmicDayDetailsByDate[dateKey];
    const cosmicCategoryDetail = cosmicCategoryKey
      ? cosmicDayDetail?.categories?.[cosmicCategoryKey]
      : undefined;
    if (cosmicCategoryDetail) {
      return buildPlannerInsightFromCosmicDetail({
        categoryDetail: cosmicCategoryDetail,
        moonPhase: cosmicDayDetail?.moonPhase ?? fallbackInsight.moonPhase,
        mercuryRetrograde: cosmicDayDetail?.mercuryRetrograde ?? fallbackInsight.mercuryRetrograde,
        fallback: fallbackInsight,
      });
    }

    const backendAction = backendInsightsByDate[dateKey]?.[category.id];

    if (backendAction) {
      const score = clamp(backendAction.score);
      const detailReady = hasBackendActionDetails(backendAction);
      const supportingAspects = detailReady
        ? backendAction.supportingAspects
        : (fallbackInsight.supportingAspects ?? []);
      const signalSeed = Math.max(1, supportingAspects.length);

      return {
        score,
        tone: toneFromScore(score),
        source: 'backend',
        reason: detailReady ? backendAction.reasoning : fallbackInsight.reason,
        dos: detailReady ? backendAction.dos : fallbackInsight.dos,
        donts: detailReady ? backendAction.donts : fallbackInsight.donts,
        supportingAspects,
        mercuryRetrograde: backendAction.mercuryRetrograde ?? fallbackInsight.mercuryRetrograde,
        moonPhase: backendAction.moonPhase || fallbackInsight.moonPhase,
        signals: {
          transit: clamp(score + signalSeed * 2),
          house: clamp(score - 4 + signalSeed),
          natal: clamp(score - 2 + signalSeed),
        },
      };
    }

    return fallbackInsight;
  }, [backendInsightsByDate, cosmicDayDetailsByDate, user?.id, interestKey, backendWindowEnd, plannerLocale]);

  const insightsByDate = useMemo<Record<string, InsightByCategory>>(() => {
    const map: Record<string, InsightByCategory> = {};

    for (const date of monthCells) {
      const dateKey = toDateKey(date);
      const byCategory: InsightByCategory = {};

      for (const category of visibleCategories) {
        byCategory[category.id] = getInsightForDate(date, category);
      }

      map[dateKey] = byCategory;
    }

    return map;
  }, [monthCells, visibleCategories, getInsightForDate]);

  const getDaySummary = useCallback((date: Date, filter: PlannerFilter): DaySummary => {
    if (!visibleCategories.length) {
      return {
        score: 0,
        tones: ['warning'],
        isPredicted: true,
        selectedInsight: null,
        topCategory: null,
      };
    }

    const dateKey = toDateKey(date);
    const dayInsights = insightsByDate[dateKey] ?? {};

    if (filter !== 'ALL') {
      const category = visibleCategories.find((item) => item.id === filter) ?? visibleCategories[0] ?? null;
      if (!category) {
        return {
          score: 0,
          tones: ['warning'],
          isPredicted: true,
          selectedInsight: null,
          topCategory: null,
        };
      }

      const insight = dayInsights[category.id] ?? getInsightForDate(date, category);
      const cosmicCategoryKey = LOCAL_CATEGORY_TO_COSMIC[category.id];
      const cosmicScore = cosmicCategoryKey
        ? cosmicPlannerDaysByDate[dateKey]?.categoryScores?.[cosmicCategoryKey]
        : undefined;
      const syncedScore = typeof cosmicScore === 'number' ? clamp(cosmicScore) : insight.score;
      return {
        score: syncedScore,
        tones: [toneFromScore(syncedScore)],
        isPredicted: insight.source === 'predicted',
        selectedInsight: { ...insight, score: syncedScore, tone: toneFromScore(syncedScore) },
        topCategory: category,
      };
    }

    const insights = visibleCategories
      .map((category) => ({
        category,
        insight: dayInsights[category.id] ?? getInsightForDate(date, category),
      }))
      .filter((item) => !!item.insight);

    if (!insights.length) {
      return {
        score: 0,
        tones: ['warning'],
        isPredicted: true,
        selectedInsight: null,
        topCategory: null,
      };
    }

    const averageScore = Math.round(
      insights.reduce((sum, item) => sum + item.insight.score, 0) / insights.length,
    );

    const hasWarning = insights.some((item) => item.insight.score < 58 || item.insight.tone === 'warning');
    const hasStrongLuck = insights.some((item) => item.insight.score >= (averageScore < 55 ? 90 : 80));
    const hasSpiritual = insights.some((item) => item.insight.tone === 'spiritual' && item.insight.score >= 45);

    const tones: PlannerTone[] = [];
    if (hasWarning) tones.push('warning');
    if ((averageScore >= 55 && hasStrongLuck) || (averageScore >= 35 && averageScore < 55 && hasStrongLuck)) {
      tones.push('luck');
    }
    if (hasSpiritual && tones.length < 3) tones.push('spiritual');
    if (!tones.length) tones.push(toneFromScore(averageScore));

    const best = insights.reduce((best, current) => {
      if (!best) return current;
      return current.insight.score > best.insight.score ? current : best;
    }, insights[0]);
    const worst = insights.reduce((best, current) => {
      if (!best) return current;
      return current.insight.score < best.insight.score ? current : best;
    }, insights[0]);
    const featured = averageScore < 50 ? worst : best;

    return {
      score: averageScore,
      tones: tones.slice(0, 3),
      isPredicted: insights.every((item) => item.insight.source === 'predicted'),
      selectedInsight: featured.insight,
      topCategory: featured.category,
    };
  }, [visibleCategories, insightsByDate, getInsightForDate, cosmicPlannerDaysByDate]);

  const cellSummaries = useMemo(() => {
    const now = new Date();
    const currentMonth = viewDate.getMonth();
    return monthCells.map((date) => {
      const summary = getDaySummary(date, activeFilter);
      return {
        date,
        summary,
        inMonth: date.getMonth() === currentMonth,
        isToday: sameDay(date, now),
      };
    });
  }, [monthCells, getDaySummary, activeFilter, viewDate]);

  const selectedSummary = useMemo(
    () => getDaySummary(selectedDate, activeFilter),
    [selectedDate, activeFilter, getDaySummary],
  );

  const selectedCategory = useMemo(() => {
    if (activeFilter !== 'ALL') {
      return visibleCategories.find((category) => category.id === activeFilter) ?? null;
    }
    return selectedSummary.topCategory;
  }, [activeFilter, visibleCategories, selectedSummary.topCategory]);

  const selectedCategoryLabel = useMemo(() => {
    if (!selectedCategory) return t('calendar.filters.all');
    return t(COSMIC_DOCK_LABEL_OVERRIDE_KEYS[selectedCategory.id] ?? selectedCategory.labelKey);
  }, [selectedCategory, t]);
  const selectedDateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);
  const selectedCosmicCategoryKey = useMemo(
    () => (selectedCategory ? (LOCAL_CATEGORY_TO_COSMIC[selectedCategory.id] ?? null) : null),
    [selectedCategory],
  );
  const selectedCosmicDayDetail = useMemo(
    () => cosmicDayDetailsByDate[selectedDateKey],
    [cosmicDayDetailsByDate, selectedDateKey],
  );
  const selectedCosmicCategoryDetail = useMemo(
    () => (selectedCosmicCategoryKey ? (selectedCosmicDayDetail?.categories?.[selectedCosmicCategoryKey] ?? undefined) : undefined),
    [selectedCosmicDayDetail, selectedCosmicCategoryKey],
  );
  const selectedCosmicDetailRequestKey = useMemo(
    () => (selectedCosmicCategoryKey ? `${selectedDateKey}:${selectedCosmicCategoryKey}:${plannerLocale}` : null),
    [selectedCosmicCategoryKey, selectedDateKey, plannerLocale],
  );
  const selectedCosmicSubcategoryList = useMemo(
    () => (selectedCosmicCategoryDetail?.subcategories ?? []).slice().sort((a, b) => b.score - a.score),
    [selectedCosmicCategoryDetail],
  );
  const selectedDetailPending = !!selectedCosmicCategoryKey
    && !selectedCosmicCategoryDetail
    && !(selectedCosmicDetailRequestKey && failedCosmicDetailKeys[selectedCosmicDetailRequestKey]);
  const showDetailSkeleton = selectedDetailPending || isDetailLoading;

  useEffect(() => {
    subCategoryCardLayoutsRef.current = {};
    subAnalysisBlockOffsetYRef.current = 0;
    subAnalysisListOffsetYRef.current = 0;
    seenSubCategoryHapticKeysRef.current.clear();
    lastSubCategoryHapticAtRef.current = 0;
  }, [selectedCosmicDetailRequestKey, detailMounted]);

  const onSubCategoryCardLayout = useCallback((key: string, y: number, height: number) => {
    subCategoryCardLayoutsRef.current[key] = {
      y: subAnalysisBlockOffsetYRef.current + subAnalysisListOffsetYRef.current + y,
      height,
    };
  }, []);

  const onDetailContentScroll = useCallback((event: any) => {
    if (!detailMounted) return;
    if (showDetailSkeleton) return;
    if (!selectedCosmicSubcategoryList.length) return;

    const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
    const viewportH = event?.nativeEvent?.layoutMeasurement?.height ?? 0;
    if (viewportH <= 0) return;

    const visibleTop = offsetY;
    const visibleBottom = offsetY + viewportH;
    const now = Date.now();

    for (const sub of selectedCosmicSubcategoryList) {
      const key = `${selectedCosmicDetailRequestKey ?? selectedDateKey}:${sub.subCategoryKey}`;
      if (seenSubCategoryHapticKeysRef.current.has(key)) continue;
      const layout = subCategoryCardLayoutsRef.current[key];
      if (!layout) continue;
      const cardTop = layout.y;
      const cardBottom = layout.y + layout.height;
      const isVisible = cardBottom > visibleTop + 8 && cardTop < visibleBottom - 8;
      if (!isVisible) continue;

      seenSubCategoryHapticKeysRef.current.add(key);
      if (now - lastSubCategoryHapticAtRef.current < 80) break;
      lastSubCategoryHapticAtRef.current = now;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      break;
    }
  }, [
    detailMounted,
    selectedCosmicSubcategoryList,
    selectedCosmicDetailRequestKey,
    selectedDateKey,
    showDetailSkeleton,
  ]);

  useEffect(() => {
    if (!detailMounted) return;
    if (!selectedCategory) return;

    const dateKey = toDateKey(selectedDate);
    const cosmicCategoryKey = LOCAL_CATEGORY_TO_COSMIC[selectedCategory.id];
    if (!cosmicCategoryKey) {
      const backendAction = backendInsightsByDate[dateKey]?.[selectedCategory.id];
      if (hasBackendActionDetails(backendAction)) return;
      const backendCategory = LOCAL_CATEGORY_TO_BACKEND[selectedCategory.id];
      if (!backendCategory) return;
      const requestKey = `${dateKey}:${backendCategory}:${plannerLocale}`;
      if (loadingDetailKeysRef.current.has(requestKey)) return;
      loadingDetailKeysRef.current.add(requestKey);
      setIsDetailLoading(true);

      void fetchPlannerChunk({
        startDate: dateKey,
        endDate: dateKey,
        responseMode: 'FULL',
        categories: [backendCategory],
        skipLoadingState: true,
        suppressError: true,
        skipErrorReset: true,
      }).finally(() => {
        loadingDetailKeysRef.current.delete(requestKey);
        setIsDetailLoading(false);
      });
      return;
    }

    if (cosmicDayDetailsByDate[dateKey]?.categories?.[cosmicCategoryKey]) return;

    const requestKey = `${dateKey}:${cosmicCategoryKey}:${plannerLocale}`;
    if (failedCosmicDetailKeys[requestKey]) return;
    if (loadingCosmicDayDetailKeysRef.current.has(requestKey)) return;
    loadingCosmicDayDetailKeysRef.current.add(requestKey);
    setIsDetailLoading(true);

    void fetchCosmicCategoryDetails({
      userId: user?.id ?? 0,
      categoryKey: cosmicCategoryKey,
      date: dateKey,
      locale: plannerLocale,
      gender: user?.gender,
      maritalStatus: user?.maritalStatus,
    }).then((response) => {
      const payload = response.data as CosmicCategoryDetailsResponse;
      setCosmicDayDetailsByDate((prev) => {
        const existing = prev[dateKey];
        const nextDay: CosmicDayDetailResponse = existing
          ? {
              ...existing,
              moonPhase: payload.moonPhase || existing.moonPhase,
              mercuryRetrograde: payload.mercuryRetrograde ?? existing.mercuryRetrograde,
              categories: {
                ...(existing.categories ?? {}),
                [payload.categoryKey]: payload.category,
              },
              generatedAt: payload.generatedAt || existing.generatedAt,
            }
          : {
              userId: payload.userId,
              date: payload.date,
              locale: payload.locale,
              moonPhase: payload.moonPhase,
              mercuryRetrograde: payload.mercuryRetrograde,
              categories: { [payload.categoryKey]: payload.category },
              generatedAt: payload.generatedAt,
            };
        return { ...prev, [dateKey]: nextDay };
      });
      setFailedCosmicDetailKeys((prev) => {
        if (!prev[requestKey]) return prev;
        const next = { ...prev };
        delete next[requestKey];
        return next;
      });
    }).catch(() => {
      // Silent fallback to existing planner insight paths.
      setFailedCosmicDetailKeys((prev) => ({ ...prev, [requestKey]: true }));
    }).finally(() => {
      loadingCosmicDayDetailKeysRef.current.delete(requestKey);
      setIsDetailLoading(false);
    });
  }, [
    detailMounted,
    selectedDate,
    selectedCategory,
    selectedCosmicCategoryKey,
    backendInsightsByDate,
    cosmicDayDetailsByDate,
    failedCosmicDetailKeys,
    user?.id,
    user?.gender,
    user?.maritalStatus,
    plannerLocale,
    fetchPlannerChunk,
  ]);

  const actionables = useMemo(
    () => ({
      dos: selectedDetailPending
        ? []
        : selectedSummary.selectedInsight?.dos?.length
        ? selectedSummary.selectedInsight.dos
        : buildActionables(t, selectedCategoryLabel, selectedSummary.score).dos,
      donts: selectedDetailPending
        ? []
        : selectedSummary.selectedInsight?.donts?.length
        ? selectedSummary.selectedInsight.donts
        : buildActionables(t, selectedCategoryLabel, selectedSummary.score).donts,
    }),
    [t, selectedCategoryLabel, selectedSummary.score, selectedSummary.selectedInsight, selectedDetailPending],
  );

  const trendPoints = useMemo<TrendPoint[]>(() => {
    if (!selectedCategory) return [];

    return Array.from({ length: 7 }, (_, idx) => {
      const date = new Date(selectedDate);
      date.setDate(selectedDate.getDate() + idx);
      const insight = getInsightForDate(date, selectedCategory);
      return {
        label: String(date.getDate()),
        score: insight.score,
      };
    });
  }, [selectedDate, selectedCategory, getInsightForDate]);

  const focusCategoryForAlert = useMemo(() => {
    if (activeFilter !== 'ALL') {
      return visibleCategories.find((category) => category.id === activeFilter) ?? null;
    }
    return visibleCategories[0] ?? null;
  }, [activeFilter, visibleCategories]);

  const actionAlert = useMemo(() => {
    if (!focusCategoryForAlert) return null;

    const start = new Date();
    for (let i = 1; i <= 45; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const insight = getInsightForDate(date, focusCategoryForAlert);
      if (insight.score >= 90) {
        return {
          date,
          score: insight.score,
          category: focusCategoryForAlert,
          predicted: insight.source === 'predicted',
        };
      }
    }

    return null;
  }, [focusCategoryForAlert, getInsightForDate]);

  const detailSheetStyle = useAnimatedStyle(() => ({
    opacity: detailProgress.value,
    transform: [
      {
        translateY: interpolate(detailProgress.value, [0, 1], [360, 0]),
      },
    ],
  }));
  const skeletonPulseStyle = useAnimatedStyle(() => ({
    opacity: skeletonPulse.value,
  }));

  const headerSubtitle = useMemo(() => {
    if (!selectedSummary.selectedInsight) return t('calendar.modelEstimated');
    return selectedSummary.isPredicted
      ? t('calendar.modelEstimated')
      : t('calendar.modelFromTransit');
  }, [selectedSummary, t]);

  const goPrevMonth = useCallback(() => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goNextMonth = useCallback(() => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const onPressCategory = useCallback((filter: PlannerFilter) => {
    setActiveFilter(filter);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const onPressDay = useCallback((date: Date) => {
    setSelectedDate(date);
    if (date.getMonth() !== viewDate.getMonth() || date.getFullYear() !== viewDate.getFullYear()) {
      setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    void Haptics.selectionAsync();
    openDetailPanel(date);
  }, [openDetailPanel, viewDate]);

  const onToggleCategory = useCallback((categoryId: PlannerCategoryId) => {
    const currentlyVisible = !hiddenCategoryIds.includes(categoryId);
    if (currentlyVisible && visibleCategories.length <= 1) return;
    setCategoryVisibility(categoryId, !currentlyVisible);
  }, [hiddenCategoryIds, visibleCategories.length, setCategoryVisibility]);

  const selectedDateHasBackendData = useMemo(
    () => !!backendInsightsByDate[toDateKey(selectedDate)],
    [backendInsightsByDate, selectedDate],
  );
  const isBeyondBackendWindow = !selectedDateHasBackendData;

  if (!chart) {
    return (
      <SafeScreen edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <OnboardingBackground />
          <LinearGradient
            colors={isDark ? ['rgba(10,15,32,0.7)', 'rgba(2,6,23,0.98)'] : ['rgba(226,232,240,0.4)', 'rgba(248,250,252,0.96)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={styles.emptyContainer}>
            <Ionicons name="planet-outline" size={64} color={colors.primary} />
            <Text style={styles.emptyTitle}>{t('calendar.errors.natalChartRequired')}</Text>
            <Text style={styles.emptyText}>{t('calendar.errors.natalChartRequiredDesc')}</Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/natal-chart')}
              accessibilityLabel={t('calendar.errors.createNatalChart')}
              accessibilityRole="button"
            >
              <Text style={styles.emptyButtonText}>{t('calendar.errors.createNatalChart')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <OnboardingBackground />
        <LinearGradient
          colors={isDark ? ['rgba(10,15,32,0.65)', 'rgba(2,6,23,0.96)'] : ['rgba(241,245,249,0.45)', 'rgba(248,250,252,0.95)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeIn.duration(300)}>
            <TabHeader
              title={t('calendar.title')}
              subtitle={t('calendar.editorialSubtitle')}
              rightActions={
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={fetchPlannerData}
                  accessibilityRole="button"
                  accessibilityLabel={t('calendar.refreshPlanner')}
                >
                  <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              }
              {...useTabHeaderActions()}
            />

            {isBeyondBackendWindow && (
              <View style={styles.noticeChip}>
                <Ionicons name="sparkles-outline" size={13} color={colors.subtext} />
                <Text style={styles.noticeChipText}>{t('calendar.estimateNotice')}</Text>
              </View>
            )}

            <View style={styles.navigatorRow}>
              <TouchableOpacity
                style={styles.navIconButton}
                onPress={goPrevMonth}
                accessibilityRole="button"
                accessibilityLabel={t('calendar.previousMonth')}
              >
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.monthChip}
                onPress={() => setMonthPickerVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t('calendar.openMonthYearSelector')}
              >
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <Text style={styles.monthChipText}>
                  {months[viewDate.getMonth()]} {viewDate.getFullYear()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navIconButton}
                onPress={goNextMonth}
                accessibilityRole="button"
                accessibilityLabel={t('calendar.nextMonth')}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {shortDays.map((day) => (
                <Text key={day} style={styles.weekDayText}>{day}</Text>
              ))}
            </View>

            <View style={styles.calendarCard}>
              {isLoading ? (
                <View style={styles.loadingBlock}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>{t('calendar.loading')}</Text>
                </View>
              ) : error ? (
                <View style={styles.errorBlock}>
                  <Ionicons name="warning-outline" size={20} color={colors.red} />
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity
                    onPress={fetchPlannerData}
                    style={styles.retryButton}
                    accessibilityRole="button"
                    accessibilityLabel={t('calendar.errors.retry')}
                  >
                    <Text style={styles.retryButtonText}>{t('calendar.errors.retry')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.gridWrap}>
                  {cellSummaries.map(({ date, summary, inMonth, isToday }) => {
                    const isSelected = sameDay(date, selectedDate);
                    const ringColor = getRingColor(summary.score);
                    const dayColor = inMonth ? colors.text : colors.subtext;
                    const dateKey = toDateKey(date);
                    const cosmicDots = activeCosmicCategoryKey
                      ? (cosmicPlannerDaysByDate[dateKey]?.dotsByCategory?.[activeCosmicCategoryKey] ?? []).slice(0, 3)
                      : [];

                    return (
                      <TouchableOpacity
                        key={dateKey}
                        style={styles.dayCell}
                        onPress={() => onPressDay(date)}
                        accessibilityRole="button"
                        accessibilityLabel={formatDateLabel(date, months)}
                      >
                        <View
                          style={[
                            styles.dayGlass,
                            { backgroundColor: getHeatColor(summary.score, isDark) },
                            isSelected && styles.dayGlassSelected,
                          ]}
                        >
                          <View style={styles.ringWrap}>
                            <View style={[styles.ringTrack, { borderColor: colors.border }]} />
                            <View
                              style={[
                                styles.ringProgress,
                                {
                                  borderColor: ringColor,
                                  borderTopColor: 'transparent',
                                  borderRightColor: summary.score > 25 ? ringColor : 'transparent',
                                  borderBottomColor: summary.score > 50 ? ringColor : 'transparent',
                                  borderLeftColor: summary.score > 75 ? ringColor : 'transparent',
                                },
                              ]}
                            />

                            <Text
                              style={[
                                styles.dayNumber,
                                { color: dayColor },
                                isToday && styles.dayToday,
                              ]}
                            >
                              {date.getDate()}
                            </Text>
                          </View>

                          {activeFilter === 'ALL' && summary.tones.length > 0 && (
                            <View style={styles.multiDotRow}>
                              {summary.tones.slice(0, 3).map((tone) => (
                                <View
                                  key={`${dateKey}-${tone}`}
                                  style={[styles.multiDot, { backgroundColor: getToneDotColor(tone) }]}
                                />
                              ))}
                            </View>
                          )}
                          {activeFilter !== 'ALL' && cosmicDots.length > 0 && (
                            <View style={styles.multiDotRow}>
                              {cosmicDots.map((dot) => (
                                <View
                                  key={`${dateKey}-${dot.subCategoryKey}`}
                                  style={[styles.multiDot, { backgroundColor: dot.colorHex }]}
                                />
                              ))}
                            </View>
                          )}

                          {summary.isPredicted && (
                            <Ionicons
                              name="sparkles-outline"
                              size={9}
                              color={colors.subtext}
                              style={styles.estimateStar}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.scoreLegendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: '#33F4D8' }]} />
                <Text style={styles.legendText}>{t('calendar.scoreLegend.high')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: '#F3C067' }]} />
                <Text style={styles.legendText}>{t('calendar.scoreLegend.mid')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: '#8B95A7' }]} />
                <Text style={styles.legendText}>{t('calendar.scoreLegend.low')}</Text>
              </View>
            </View>

            {activeFilter !== 'ALL' && activeCosmicLegend.length > 0 && (
              <View style={styles.subLegendCard}>
                <Text style={styles.subLegendTitle}>
                  {t('calendar.subcategoryLegendTitle', { category: selectedCategoryLabel })}
                </Text>
                <View style={styles.subLegendList}>
                  {activeCosmicLegend.map((item) => (
                    <View key={`${activeCosmicCategoryKey}-${item.subCategoryKey}`} style={styles.subLegendRow}>
                      <View style={[styles.subLegendDot, { backgroundColor: item.colorHex }]} />
                      <Text style={styles.subLegendText}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.dockHeader}>
              <Text style={styles.dockTitle}>{t('calendar.categoryDock')}</Text>
              <TouchableOpacity
                style={styles.customizeButton}
                onPress={() => setSettingsVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t('calendar.customizeCategories')}
              >
                <Ionicons name="settings-outline" size={14} color={colors.primary} />
                <Text style={styles.customizeButtonText}>{t('calendar.customize')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dockRow}>
              {visibleDockCategories.map((category) => {
                const isActive = activeFilter === category.id;
                const dockLabel = t(COSMIC_DOCK_LABEL_OVERRIDE_KEYS[category.id] ?? category.labelKey);
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                    onPress={() => onPressCategory(category.id)}
                    accessibilityRole="button"
                    accessibilityLabel={dockLabel}
                  >
                    <Ionicons name={category.icon as any} size={16} color={isActive ? colors.white : colors.subtext} />
                    <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                      {dockLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <Ionicons name="notifications-outline" size={16} color={colors.primary} />
                <Text style={styles.alertTitle}>{t('calendar.actionAlertTitle')}</Text>
              </View>
              {actionAlert ? (
                <Text style={styles.alertText}>
                  {t('calendar.actionAlertMessage', {
                    date: formatDateLabel(actionAlert.date, months),
                    category: t(actionAlert.category.labelKey),
                    score: actionAlert.score,
                  })}
                </Text>
              ) : (
                <Text style={styles.alertText}>{t('calendar.actionAlertEmpty')}</Text>
              )}
            </View>
          </Animated.View>
        </ScrollView>

        <Modal
          visible={monthPickerVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setMonthPickerVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setMonthPickerVisible(false)}>
            <Pressable style={styles.monthModalCard} onPress={(event) => event.stopPropagation()}>
              <View style={styles.monthModalHeader}>
                <Text style={styles.monthModalTitle}>{t('calendar.monthYearModalTitle')}</Text>
                <TouchableOpacity
                  onPress={() => setMonthPickerVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                >
                  <Ionicons name="close" size={20} color={colors.subtext} />
                </TouchableOpacity>
              </View>

              <View style={styles.yearStepperRow}>
                <TouchableOpacity
                  style={styles.yearStepperButton}
                  onPress={() => setViewDate((prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1))}
                  accessibilityRole="button"
                  accessibilityLabel={t('calendar.previousYear')}
                >
                  <Ionicons name="chevron-back" size={18} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.yearStepperText}>{viewDate.getFullYear()}</Text>
                <TouchableOpacity
                  style={styles.yearStepperButton}
                  onPress={() => setViewDate((prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1))}
                  accessibilityRole="button"
                  accessibilityLabel={t('calendar.nextYear')}
                >
                  <Ionicons name="chevron-forward" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.monthGrid}>
                {months.map((monthName, monthIndex) => {
                  const selected = monthIndex === viewDate.getMonth();
                  return (
                    <TouchableOpacity
                      key={`${monthName}-${monthIndex}`}
                      style={[styles.monthButton, selected && styles.monthButtonActive]}
                      onPress={() => {
                        setViewDate((prev) => new Date(prev.getFullYear(), monthIndex, 1));
                        void Haptics.selectionAsync();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={monthName}
                    >
                      <Text style={[styles.monthButtonText, selected && styles.monthButtonTextActive]}>{monthName}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={settingsVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setSettingsVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setSettingsVisible(false)}>
            <Pressable style={styles.settingsCard} onPress={(event) => event.stopPropagation()}>
              <View style={styles.settingsHeader}>
                <Text style={styles.settingsTitle}>{t('calendar.customizeCategories')}</Text>
                <TouchableOpacity
                  onPress={() => setSettingsVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                >
                  <Ionicons name="close" size={20} color={colors.subtext} />
                </TouchableOpacity>
              </View>

              <Text style={styles.settingsSubtitle}>{t('calendar.customizeHint')}</Text>

              <ScrollView style={styles.settingsList}>
                {availableCategories.map((category) => {
                  const isVisible = !hiddenCategoryIds.includes(category.id);
                  return (
                    <View key={category.id} style={styles.settingRow}>
                      <View style={styles.settingInfo}>
                        <View style={styles.settingIconWrap}>
                          <Ionicons name={category.icon as any} size={15} color={colors.primary} />
                        </View>
                        <View style={styles.settingTextWrap}>
                          <Text style={styles.settingTitle}>{t(category.labelKey)}</Text>
                          <Text style={styles.settingDesc}>{t(category.descriptionKey)}</Text>
                        </View>
                      </View>

                      <Switch
                        value={isVisible}
                        onValueChange={() => onToggleCategory(category.id)}
                        trackColor={{ false: colors.switchTrack, true: colors.primarySoft }}
                        thumbColor={isVisible ? colors.primary : colors.white}
                      />
                    </View>
                  );
                })}
              </ScrollView>

              {visibleCategories.length <= 1 && (
                <Text style={styles.minimumHint}>{t('calendar.minimumCategoryHint')}</Text>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={detailMounted}
          transparent
          animationType="none"
          onRequestClose={closeDetailPanel}
        >
          <Pressable style={styles.sheetBackdrop} onPress={closeDetailPanel} />

          <Animated.View style={[styles.detailSheet, detailSheetStyle]}>
            <View style={styles.sheetHandle} />

            <View style={styles.detailHeader}>
              <Text style={styles.detailDate}>{formatDateLabel(selectedDate, months)}</Text>
              <Text style={styles.detailSource}>{headerSubtitle}</Text>
            </View>

            <View style={styles.bigScoreRow}>
              <Text style={styles.bigScoreText}>%{selectedSummary.score}</Text>
              <View style={styles.bigScoreMeta}>
                <Text style={styles.bigScoreLabel}>{t('calendar.cosmicPotential')}</Text>
                <Text style={styles.bigScoreCategory}>{selectedCategoryLabel}</Text>
              </View>
            </View>

            <View style={styles.whyBlock}>
              <Text style={styles.whyTitle}>{t('calendar.whyTitle')}</Text>
              {showDetailSkeleton ? (
                <Animated.View style={[styles.skeletonWhyWrap, skeletonPulseStyle]}>
                  <View style={[styles.skeletonLine, styles.skeletonWhyLine1]} />
                  <View style={[styles.skeletonLine, styles.skeletonWhyLine2]} />
                  <View style={[styles.skeletonLine, styles.skeletonWhyLine3]} />
                </Animated.View>
              ) : (
                <Text style={styles.whyText}>
                  {t('calendar.whyTemplate', {
                    reason: selectedSummary.selectedInsight?.reason ?? t('calendar.whyFallback'),
                  })}
                </Text>
              )}
            </View>

            <ScrollView
              style={styles.detailScrollView}
              contentContainerStyle={styles.detailScrollContent}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={onDetailContentScroll}
            >
              <Text style={styles.listTitle}>{t('calendar.dosTitle')}</Text>
              <View style={styles.actionList}>
                {showDetailSkeleton ? (
                  <>
                    <Animated.View style={[styles.skeletonActionCard, skeletonPulseStyle]}>
                      <View style={[styles.skeletonIconPill, styles.skeletonDoAccent]} />
                      <View style={styles.skeletonLines}>
                        <View style={[styles.skeletonLine, styles.skeletonLineLong]} />
                        <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
                      </View>
                    </Animated.View>
                    <Animated.View style={[styles.skeletonActionCard, skeletonPulseStyle]}>
                      <View style={[styles.skeletonIconPill, styles.skeletonDoAccent]} />
                      <View style={styles.skeletonLines}>
                        <View style={[styles.skeletonLine, styles.skeletonLineMid]} />
                      </View>
                    </Animated.View>
                  </>
                ) : (
                  actionables.dos.map((line) => (
                    <View key={`do-${line}`} style={styles.doCard}>
                      <Text style={styles.doText}>✅ {line}</Text>
                    </View>
                  ))
                )}
              </View>

              <Text style={styles.listTitle}>{t('calendar.dontsTitle')}</Text>
              <View style={styles.actionList}>
                {showDetailSkeleton ? (
                  <>
                    <Animated.View style={[styles.skeletonActionCard, skeletonPulseStyle]}>
                      <View style={[styles.skeletonIconPill, styles.skeletonDontAccent]} />
                      <View style={styles.skeletonLines}>
                        <View style={[styles.skeletonLine, styles.skeletonLineLong]} />
                        <View style={[styles.skeletonLine, styles.skeletonLineMid]} />
                      </View>
                    </Animated.View>
                    <Animated.View style={[styles.skeletonActionCard, skeletonPulseStyle]}>
                      <View style={[styles.skeletonIconPill, styles.skeletonDontAccent]} />
                      <View style={styles.skeletonLines}>
                        <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
                      </View>
                    </Animated.View>
                  </>
                ) : (
                  actionables.donts.map((line) => (
                    <View key={`dont-${line}`} style={styles.dontCard}>
                      <Text style={styles.dontText}>❌ {line}</Text>
                    </View>
                  ))
                )}
              </View>

              {!showDetailSkeleton && selectedCosmicSubcategoryList.length > 0 && (
                <View
                  style={styles.subAnalysisBlock}
                  onLayout={(event) => {
                    subAnalysisBlockOffsetYRef.current = event.nativeEvent.layout.y;
                  }}
                >
                  <Text style={styles.subAnalysisTitle}>{t('calendar.starCategories')}</Text>
                  <View
                    style={styles.subAnalysisList}
                    onLayout={(event) => {
                      subAnalysisListOffsetYRef.current = event.nativeEvent.layout.y;
                    }}
                  >
                    {selectedCosmicSubcategoryList.map((sub, index) => {
                      const subKey = `${selectedCosmicDetailRequestKey ?? selectedDateKey}:${sub.subCategoryKey}`;
                      return (
                        <Animated.View
                          key={`${selectedCosmicCategoryKey}-${sub.subCategoryKey}`}
                          entering={FadeInDown.delay(Math.min(index * 18, 120)).duration(220)}
                          style={styles.subAnalysisCard}
                          onLayout={(event) => {
                            const { y, height } = event.nativeEvent.layout;
                            onSubCategoryCardLayout(subKey, y, height);
                          }}
                        >
                          <View style={styles.subAnalysisGlowWrap}>
                            <View style={[styles.subAnalysisGlow, { backgroundColor: sub.colorHex, shadowColor: sub.colorHex }]} />
                          </View>
                          <View style={styles.subAnalysisContent}>
                            <View style={styles.subAnalysisTopRow}>
                              <View style={styles.subAnalysisLeft}>
                                <View style={[styles.subAnalysisIconWrap, { backgroundColor: `${sub.colorHex}18`, borderColor: `${sub.colorHex}33` }]}>
                                  <Ionicons
                                    name={iconForCosmicSubcategory(selectedCosmicCategoryKey, sub.subCategoryKey)}
                                    size={14}
                                    color={sub.colorHex}
                                  />
                                </View>
                                <View style={styles.subAnalysisTextWrap}>
                                  <Text style={styles.subAnalysisName} numberOfLines={1}>{sub.label}</Text>
                                  <Text style={styles.subAnalysisInsight} numberOfLines={3}>
                                    {sub.insight || sub.shortAdvice}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.subAnalysisScore}>%{sub.score}</Text>
                            </View>

                            {!!sub.technicalExplanation && (
                              <Text style={styles.subAnalysisTechnical} numberOfLines={3}>
                                {sub.technicalExplanation}
                              </Text>
                            )}

                            <View style={styles.subAnalysisBarTrack}>
                              <View
                                style={[
                                  styles.subAnalysisBarFill,
                                  { width: `${clamp(sub.score)}%`, backgroundColor: sub.colorHex },
                                ]}
                              />
                            </View>
                          </View>
                        </Animated.View>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.sheetFooterRow}>
              <TouchableOpacity
                style={styles.deepDiveButton}
                onPress={() => setBlueprintVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t('calendar.openDeepDive')}
              >
                <Ionicons name="analytics-outline" size={16} color={colors.white} />
                <Text style={styles.deepDiveButtonText}>{t('calendar.openDeepDive')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeSheetButton}
                onPress={closeDetailPanel}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <Text style={styles.closeSheetButtonText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Modal>

        <Modal
          visible={blueprintVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setBlueprintVisible(false)}
        >
          <SafeScreen edges={['top', 'left', 'right']}>
            <View style={styles.blueprintContainer}>
              <View style={styles.blueprintHeader}>
                <View>
                  <Text style={styles.blueprintTitle}>{t('calendar.deepDiveTitle')}</Text>
                  <Text style={styles.blueprintSubtitle}>{formatDateLabel(selectedDate, months)}</Text>
                </View>

                <TouchableOpacity
                  style={styles.blueprintClose}
                  onPress={() => setBlueprintVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                >
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.blueprintScrollContent}>
                <View style={styles.blueprintSection}>
                  <Text style={styles.blueprintSectionTitle}>{t('calendar.starCategories')}</Text>

                  <View style={styles.signalRow}>
                    <Text style={styles.signalLabel}>{t('calendar.signalTransit')}</Text>
                    <Text style={styles.signalValue}>%{selectedSummary.selectedInsight?.signals.transit ?? selectedSummary.score}</Text>
                  </View>

                  <View style={styles.signalRow}>
                    <Text style={styles.signalLabel}>{t('calendar.signalHouse')}</Text>
                    <Text style={styles.signalValue}>%{selectedSummary.selectedInsight?.signals.house ?? selectedSummary.score}</Text>
                  </View>

                  <View style={styles.signalRow}>
                    <Text style={styles.signalLabel}>{t('calendar.signalNatal')}</Text>
                    <Text style={styles.signalValue}>%{selectedSummary.selectedInsight?.signals.natal ?? selectedSummary.score}</Text>
                  </View>
                </View>

                <View style={styles.blueprintSection}>
                  <Text style={styles.blueprintSectionTitle}>{t('calendar.activeAspects')}</Text>
                  {(selectedSummary.selectedInsight?.supportingAspects ?? []).map((aspect, index) => (
                    <View key={`${aspect}-${index}`} style={styles.aspectRow}>
                      <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                      <Text style={styles.aspectText}>{aspect}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.blueprintSection}>
                  <Text style={styles.blueprintSectionTitle}>{t('calendar.trend7Days')}</Text>
                  <TrendLineChart points={trendPoints} colors={colors} />
                </View>
              </ScrollView>
            </View>
          </SafeScreen>
        </Modal>
      </View>
    </SafeScreen>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    scrollContent: {
      paddingTop: Platform.OS === 'ios' ? 60 : 24,
      paddingBottom: 100,
      paddingHorizontal: 18,
      gap: 14,
    },
    refreshButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.surfaceGlass,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
    },
    noticeChip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: C.surfaceGlass,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
    },
    noticeChipText: {
      color: C.subtext,
      fontSize: 11,
      fontFamily: UI_FONT,
    },
    navigatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    navIconButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.surfaceGlass,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
    },
    monthChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.surfaceGlass,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    monthChipText: {
      color: C.text,
      fontSize: 14,
      fontWeight: '600',
      fontFamily: UI_FONT,
    },
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 6,
      marginTop: 2,
    },
    weekDayText: {
      width: `${100 / 7}%`,
      textAlign: 'center',
      color: C.subtext,
      fontSize: 12,
      fontWeight: '600',
      fontFamily: UI_FONT,
    },
    calendarCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: isDark ? 'rgba(11,19,37,0.64)' : 'rgba(255,255,255,0.68)',
      overflow: 'hidden',
      shadowColor: C.primary,
      shadowOpacity: isDark ? 0.24 : 0.1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    loadingBlock: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      gap: 10,
    },
    loadingText: {
      color: C.subtext,
      fontSize: 13,
      fontStyle: 'italic',
      fontFamily: UI_FONT,
    },
    errorBlock: {
      padding: 18,
      gap: 8,
      alignItems: 'center',
    },
    errorText: {
      color: C.red,
      textAlign: 'center',
      fontSize: 13,
      fontFamily: UI_FONT,
    },
    retryButton: {
      marginTop: 4,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: C.primarySoft,
    },
    retryButtonText: {
      color: C.primary,
      fontWeight: '700',
      fontSize: 12,
      fontFamily: UI_FONT,
    },
    gridWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    dayCell: {
      width: `${100 / 7}%`,
      padding: 4,
      minHeight: 56,
    },
    dayGlass: {
      borderRadius: 14,
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      overflow: 'hidden',
    },
    dayGlassSelected: {
      borderColor: C.primary,
      borderWidth: 1.6,
      shadowColor: C.primary,
      shadowOpacity: 0.36,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
    },
    ringWrap: {
      width: 31,
      height: 31,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringTrack: {
      ...StyleSheet.absoluteFillObject,
      borderWidth: 2,
      borderRadius: 18,
      opacity: 0.45,
    },
    ringProgress: {
      ...StyleSheet.absoluteFillObject,
      borderWidth: 2,
      borderRadius: 18,
      transform: [{ rotate: '-90deg' }],
    },
    dayNumber: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: UI_FONT,
    },
    dayToday: {
      color: C.primary,
    },
    multiDotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginTop: 2,
      marginBottom: -1,
    },
    multiDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    estimateStar: {
      position: 'absolute',
      right: 4,
      top: 4,
      opacity: 0.7,
    },
    scoreLegendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
      paddingHorizontal: 2,
      gap: 8,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    legendSwatch: {
      width: 9,
      height: 9,
      borderRadius: 4.5,
    },
    legendText: {
      color: C.subtext,
      fontSize: 11,
      fontFamily: UI_FONT,
    },
    subLegendCard: {
      marginTop: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.surfaceGlass,
      padding: 12,
      gap: 8,
    },
    subLegendTitle: {
      color: C.text,
      fontSize: 12,
      fontWeight: '700',
      fontFamily: UI_FONT,
    },
    subLegendList: {
      gap: 8,
    },
    subLegendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    subLegendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    subLegendText: {
      color: C.text,
      fontSize: 12,
      fontWeight: '600',
      fontFamily: UI_FONT,
    },
    dockHeader: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dockTitle: {
      color: C.text,
      fontSize: 14,
      fontWeight: '700',
      fontFamily: UI_FONT,
    },
    customizeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 11,
      borderRadius: 999,
      backgroundColor: C.surfaceGlass,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
    },
    customizeButtonText: {
      color: C.primary,
      fontSize: 12,
      fontWeight: '700',
      fontFamily: UI_FONT,
    },
    dockRow: {
      paddingTop: 8,
      paddingBottom: 2,
      gap: 8,
      paddingRight: 8,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surfaceGlass,
      paddingVertical: 8,
      paddingHorizontal: 13,
    },
    categoryChipActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    categoryChipText: {
      color: C.subtext,
      fontSize: 12,
      fontWeight: '600',
      fontFamily: UI_FONT,
    },
    categoryChipTextActive: {
      color: C.white,
    },
    alertCard: {
      marginTop: 8,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.surfaceGlass,
      gap: 8,
    },
    alertHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    alertTitle: {
      color: C.text,
      fontSize: 13,
      fontWeight: '700',
      fontFamily: UI_FONT,
    },
    alertText: {
      color: C.subtext,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: UI_FONT,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(2,6,23,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    monthModalCard: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.card,
      padding: 16,
      gap: 12,
    },
    monthModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    monthModalTitle: {
      color: C.text,
      fontSize: 16,
      fontWeight: '700',
      fontFamily: UI_FONT,
    },
    yearStepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    yearStepperButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    yearStepperText: {
      color: C.text,
      fontSize: 19,
      fontWeight: '700',
      fontFamily: SCORE_FONT,
    },
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    monthButton: {
      width: '31%',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthButtonActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    monthButtonText: {
      color: C.text,
      fontSize: 12,
      fontWeight: '600',
      fontFamily: UI_FONT,
    },
    monthButtonTextActive: {
      color: C.white,
    },
    settingsCard: {
      width: '100%',
      maxWidth: 460,
      maxHeight: '82%',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.card,
      padding: 16,
      gap: 10,
    },
    settingsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    settingsTitle: {
      color: C.text,
      fontSize: 16,
      fontWeight: '700',
      fontFamily: UI_FONT,
    },
    settingsSubtitle: {
      color: C.subtext,
      fontSize: 12,
      lineHeight: 17,
      fontFamily: UI_FONT,
    },
    settingsList: {
      maxHeight: 360,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.borderMuted,
      gap: 10,
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    settingIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.primarySoft,
    },
    settingTextWrap: {
      flex: 1,
      gap: 2,
    },
    settingTitle: {
      color: C.text,
      fontSize: 13,
      fontWeight: '700',
      fontFamily: UI_FONT,
    },
    settingDesc: {
      color: C.subtext,
      fontSize: 11,
      fontFamily: UI_FONT,
    },
    minimumHint: {
      color: C.orange,
      fontSize: 11,
      fontFamily: UI_FONT,
    },
    sheetBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(2,6,23,0.45)',
    },
    detailSheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: C.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: Platform.OS === 'ios' ? 36 : 22,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      maxHeight: '88%',
      overflow: 'hidden',
    },
    sheetHandle: {
      width: 44,
      height: 4,
      borderRadius: 4,
      backgroundColor: C.border,
      alignSelf: 'center',
      marginBottom: 12,
    },
    detailHeader: {
      marginBottom: 8,
      gap: 4,
    },
    detailDate: {
      color: C.text,
      fontSize: 17,
      fontWeight: '700',
      fontFamily: UI_FONT,
    },
    detailSource: {
      color: C.subtext,
      fontSize: 12,
      fontFamily: UI_FONT,
    },
    bigScoreRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 12,
      marginBottom: 10,
    },
    bigScoreText: {
      color: C.primary,
      fontSize: 52,
      lineHeight: 54,
      fontWeight: '700',
      fontFamily: SCORE_FONT,
    },
    bigScoreMeta: {
      gap: 2,
      paddingBottom: 8,
      flex: 1,
    },
    bigScoreLabel: {
      color: C.subtext,
      fontSize: 12,
      fontFamily: UI_FONT,
    },
    bigScoreCategory: {
      color: C.text,
      fontSize: 14,
      fontWeight: '700',
      fontFamily: UI_FONT,
    },
    listTitle: {
      color: C.text,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 6,
      marginBottom: 6,
      fontFamily: UI_FONT,
    },
    actionList: {
      gap: 7,
    },
    doCard: {
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: isDark ? 'rgba(46,204,113,0.12)' : 'rgba(22,163,74,0.1)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(46,204,113,0.2)' : 'rgba(22,163,74,0.2)',
    },
    doText: {
      color: C.green,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
      fontFamily: UI_FONT,
    },
    dontCard: {
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: isDark ? 'rgba(252,74,74,0.12)' : 'rgba(224,84,84,0.1)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(252,74,74,0.24)' : 'rgba(224,84,84,0.2)',
    },
    skeletonActionCard: {
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: C.surfaceSoft,
      borderWidth: 1,
      borderColor: C.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    skeletonIconPill: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1,
    },
    skeletonDoAccent: {
      backgroundColor: isDark ? 'rgba(46,204,113,0.18)' : 'rgba(22,163,74,0.14)',
      borderColor: isDark ? 'rgba(46,204,113,0.28)' : 'rgba(22,163,74,0.2)',
    },
    skeletonDontAccent: {
      backgroundColor: isDark ? 'rgba(252,74,74,0.18)' : 'rgba(224,84,84,0.14)',
      borderColor: isDark ? 'rgba(252,74,74,0.28)' : 'rgba(224,84,84,0.2)',
    },
    skeletonLines: {
      flex: 1,
      gap: 6,
    },
    skeletonLine: {
      height: 8,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(148,163,184,0.26)' : 'rgba(148,163,184,0.22)',
    },
    skeletonLineLong: {
      width: '88%',
    },
    skeletonLineMid: {
      width: '64%',
    },
    skeletonLineShort: {
      width: '52%',
    },
    skeletonWhyWrap: {
      gap: 8,
    },
    dontText: {
      color: C.red,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
      fontFamily: UI_FONT,
    },
    skeletonWhyLine1: {
      width: '96%',
    },
    skeletonWhyLine2: {
      width: '82%',
    },
    skeletonWhyLine3: {
      width: '67%',
    },
    whyBlock: {
      marginTop: 10,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.surfaceGlass,
      gap: 6,
    },
    whyTitle: {
      color: C.text,
      fontSize: 13,
      fontWeight: '700',
      fontFamily: UI_FONT,
    },
    whyText: {
      color: C.subtext,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: UI_FONT,
    },
    detailScrollView: {
      marginTop: 6,
      flexShrink: 1,
      minHeight: 0,
    },
    detailScrollContent: {
      paddingBottom: 40,
    },
    subAnalysisBlock: {
      marginTop: 10,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.surfaceGlass,
      gap: 8,
    },
    subAnalysisTitle: {
      color: C.text,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.3,
      fontFamily: UI_FONT,
    },
    subAnalysisList: {
      gap: 8,
    },
    subAnalysisCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      flexDirection: 'row',
      alignItems: 'stretch',
      overflow: 'hidden',
    },
    subAnalysisGlowWrap: {
      width: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingLeft: 4,
    },
    subAnalysisGlow: {
      width: 3,
      alignSelf: 'stretch',
      borderRadius: 999,
      shadowOpacity: 0.35,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
      opacity: 0.95,
    },
    subAnalysisContent: {
      flex: 1,
      paddingVertical: 10,
      paddingRight: 10,
      gap: 7,
    },
    subAnalysisTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    subAnalysisLeft: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      flex: 1,
    },
    subAnalysisIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    subAnalysisTextWrap: {
      flex: 1,
      gap: 2,
    },
    subAnalysisName: {
      color: C.text,
      fontSize: 12,
      fontWeight: '700',
      fontFamily: UI_FONT,
    },
    subAnalysisInsight: {
      color: C.subtext,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: UI_FONT,
    },
    subAnalysisScore: {
      color: C.text,
      fontSize: 12,
      fontWeight: '800',
      fontFamily: UI_FONT,
    },
    subAnalysisTechnical: {
      color: C.subtext,
      fontSize: 10,
      lineHeight: 14,
      fontFamily: UI_FONT,
      opacity: 0.9,
    },
    subAnalysisBarTrack: {
      height: 3,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor: C.borderMuted,
    },
    subAnalysisBarFill: {
      height: '100%',
      borderRadius: 999,
    },
    sheetFooterRow: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    deepDiveButton: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: C.primary,
      paddingVertical: 11,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    deepDiveButtonText: {
      color: C.white,
      fontSize: 13,
      fontWeight: '700',
      fontFamily: UI_FONT,
    },
    closeSheetButton: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      paddingVertical: 11,
      paddingHorizontal: 16,
      backgroundColor: C.surface,
    },
    closeSheetButtonText: {
      color: C.text,
      fontSize: 13,
      fontWeight: '600',
      fontFamily: UI_FONT,
    },
    blueprintContainer: {
      flex: 1,
      backgroundColor: C.background,
      paddingHorizontal: 18,
      paddingTop: Platform.OS === 'ios' ? 14 : 12,
    },
    blueprintHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    blueprintTitle: {
      color: C.text,
      fontSize: 24,
      fontWeight: '700',
      fontFamily: SCORE_FONT,
    },
    blueprintSubtitle: {
      color: C.subtext,
      fontSize: 12,
      marginTop: 2,
      fontFamily: UI_FONT,
    },
    blueprintClose: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    blueprintScrollContent: {
      paddingBottom: 36,
      gap: 12,
    },
    blueprintSection: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.surfaceGlass,
      padding: 14,
      gap: 10,
    },
    blueprintSectionTitle: {
      color: C.text,
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 0.35,
      fontFamily: UI_FONT,
    },
    signalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: C.borderMuted,
      paddingBottom: 7,
    },
    signalLabel: {
      color: C.subtext,
      fontSize: 12,
      fontFamily: UI_FONT,
    },
    signalValue: {
      color: C.text,
      fontSize: 13,
      fontWeight: '700',
      fontFamily: UI_FONT,
    },
    aspectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: C.surface,
    },
    aspectText: {
      color: C.text,
      fontSize: 12,
      flex: 1,
      fontFamily: UI_FONT,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 10,
    },
    emptyTitle: {
      color: C.text,
      fontSize: 19,
      fontWeight: '700',
      marginTop: 8,
      textAlign: 'center',
      fontFamily: UI_FONT,
    },
    emptyText: {
      color: C.subtext,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      fontFamily: UI_FONT,
    },
    emptyButton: {
      marginTop: 10,
      borderRadius: 14,
      backgroundColor: C.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    emptyButtonText: {
      color: C.white,
      fontSize: 14,
      fontWeight: '700',
      fontFamily: UI_FONT,
    },
  });
}
