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
  Easing,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import axios from 'axios/dist/browser/axios.cjs';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { SafeScreen } from '../../components/ui';
import { ThemeColors, useTheme } from '../../context/ThemeContext';
import {
  PlannerCategoryAction,
  PlannerFullDistributionResponse,
  fetchPlannerFullDistribution,
} from '../../services/lucky-dates.service';
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

const BACKEND_MONTHS_AHEAD = 6;
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
  BEAUTY: 'beauty',
  HEALTH: 'health',
  ACTIVITY: 'activity',
  OFFICIAL: 'official',
  SPIRITUAL: 'spiritual',
  COLOR: 'color',
  RECOMMENDATIONS: 'recommendations',
};

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
  if (score >= 80) return 'luck';
  if (score < 50) return 'warning';
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
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const chart = useNatalChartStore((s) => s.chart);

  const hiddenCategoryIds = usePlannerPreferencesStore((s) => s.hiddenCategoryIds);
  const setCategoryVisibility = usePlannerPreferencesStore((s) => s.setCategoryVisibility);

  const [plannerDistribution, setPlannerDistribution] = useState<PlannerFullDistributionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewDate, setViewDate] = useState(() => new Date());
  const [activeFilter, setActiveFilter] = useState<PlannerFilter>('ALL');
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [blueprintVisible, setBlueprintVisible] = useState(false);
  const [detailMounted, setDetailMounted] = useState(false);

  const detailProgress = useSharedValue(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const months = useMemo(() => t('calendar.months').split(','), [t]);
  const shortDays = useMemo(() => t('calendar.shortDays').split(','), [t]);
  const backendWindowEnd = useMemo(
    () => getBackendWindowEndDate(BACKEND_MONTHS_AHEAD),
    [],
  );

  const hiddenKey = useMemo(() => hiddenCategoryIds.slice().sort().join('|'), [hiddenCategoryIds]);
  const personalization = useMemo(
    () => buildPersonalizedCategories(user, new Set(hiddenCategoryIds)),
    [user?.gender, user?.focusPoint, user?.maritalStatus, hiddenKey],
  );

  const availableCategories = personalization.available;
  const visibleCategories = personalization.visible;
  const interestTagList = useMemo(
    () => Array.from(personalization.interestTags),
    [personalization.interestTags],
  );
  const interestKey = useMemo(
    () => interestTagList.slice().sort().join('|'),
    [interestTagList],
  );

  useEffect(() => {
    if (
      activeFilter !== 'ALL'
      && !visibleCategories.some((category) => category.id === activeFilter)
    ) {
      setActiveFilter('ALL');
    }
  }, [activeFilter, visibleCategories]);

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

  const fetchPlannerData = useCallback(async () => {
    const userId = user?.id;
    if (!userId || !chart) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchPlannerFullDistribution({
        userId,
        monthsAhead: BACKEND_MONTHS_AHEAD,
        userGender: user?.gender,
      });
      setPlannerDistribution(response.data);
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const msg = err.response?.data?.message as string | undefined;
        if (status === 404 && msg?.includes('Natal chart not found')) {
          setError(t('calendar.errors.natalChartNotFound'));
        } else if (status === 400) {
          setError(msg || t('calendar.errors.invalidRequest'));
        } else {
          setError(t('calendar.errors.serviceUnavailable'));
        }
      } else {
        setError(t('calendar.errors.connectionError'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.gender, chart, t]);

  const fetchedRef = useRef(false);
  useEffect(() => {
    if (!chart || !user?.id || fetchedRef.current) return;
    fetchedRef.current = true;
    void fetchPlannerData();
  }, [chart, user?.id, fetchPlannerData]);

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

  const getInsightForDate = useCallback((date: Date, category: PlannerCategoryDefinition): PlannerInsight => {
    const dateKey = toDateKey(date);
    const backendAction = backendInsightsByDate[dateKey]?.[category.id];
    if (backendAction) {
      const score = clamp(backendAction.score);
      const signalSeed = Math.max(1, backendAction.supportingAspects.length);
      return {
        score,
        tone: toneFromScore(score),
        source: 'backend',
        reason: backendAction.reasoning,
        dos: backendAction.dos,
        donts: backendAction.donts,
        supportingAspects: backendAction.supportingAspects,
        mercuryRetrograde: backendAction.mercuryRetrograde,
        moonPhase: backendAction.moonPhase,
        signals: {
          transit: clamp(score + signalSeed * 2),
          house: clamp(score - 4 + signalSeed),
          natal: clamp(score - 2 + signalSeed),
        },
      };
    }

    const interestTags = new Set(personalization.interestTags);

    return buildPlannerInsight({
      date,
      category,
      userId: user?.id,
      interestTags,
      cards: [],
      backendWindowEnd,
    });
  }, [backendInsightsByDate, user?.id, interestKey, backendWindowEnd]);

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
      return {
        score: insight.score,
        tones: [insight.tone],
        isPredicted: insight.source === 'predicted',
        selectedInsight: insight,
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

    const tones = Array.from(
      new Set(
        insights
          .map((item) => item.insight.tone)
          .sort((a, b) => tonePriority(b) - tonePriority(a)),
      ),
    ).slice(0, 3) as PlannerTone[];

    const top = insights.reduce((best, current) => {
      if (!best) return current;
      return current.insight.score > best.insight.score ? current : best;
    }, insights[0]);

    return {
      score: averageScore,
      tones,
      isPredicted: insights.every((item) => item.insight.source === 'predicted'),
      selectedInsight: top.insight,
      topCategory: top.category,
    };
  }, [visibleCategories, insightsByDate, getInsightForDate]);

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
    return t(selectedCategory.labelKey);
  }, [selectedCategory, t]);

  const actionables = useMemo(
    () => ({
      dos: selectedSummary.selectedInsight?.dos?.length
        ? selectedSummary.selectedInsight.dos
        : buildActionables(t, selectedCategoryLabel, selectedSummary.score).dos,
      donts: selectedSummary.selectedInsight?.donts?.length
        ? selectedSummary.selectedInsight.donts
        : buildActionables(t, selectedCategoryLabel, selectedSummary.score).donts,
    }),
    [t, selectedCategoryLabel, selectedSummary.score, selectedSummary.selectedInsight],
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

  const plannerEndDate = useMemo(
    () => (plannerDistribution?.endDate ? new Date(plannerDistribution.endDate) : backendWindowEnd),
    [plannerDistribution?.endDate, backendWindowEnd],
  );
  const isBeyondBackendWindow = selectedDate > plannerEndDate;

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
            <View style={styles.headerRow}>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerTitle}>{t('calendar.title')}</Text>
                <Text style={styles.headerSubtitle}>{t('calendar.editorialSubtitle')}</Text>
              </View>

              <TouchableOpacity
                style={styles.refreshButton}
                onPress={fetchPlannerData}
                accessibilityRole="button"
                accessibilityLabel={t('calendar.refreshPlanner')}
              >
                <Ionicons name="refresh-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

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

                    return (
                      <TouchableOpacity
                        key={toDateKey(date)}
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
                                  key={`${toDateKey(date)}-${tone}`}
                                  style={[styles.multiDot, { backgroundColor: getToneDotColor(tone) }]}
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
              <TouchableOpacity
                style={[styles.categoryChip, activeFilter === 'ALL' && styles.categoryChipActive]}
                onPress={() => onPressCategory('ALL')}
                accessibilityRole="button"
                accessibilityLabel={t('calendar.filters.all')}
              >
                <Ionicons name="apps-outline" size={16} color={activeFilter === 'ALL' ? colors.white : colors.subtext} />
                <Text style={[styles.categoryChipText, activeFilter === 'ALL' && styles.categoryChipTextActive]}>
                  {t('calendar.filters.all')}
                </Text>
              </TouchableOpacity>

              {visibleCategories.map((category) => {
                const isActive = activeFilter === category.id;
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                    onPress={() => onPressCategory(category.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t(category.labelKey)}
                  >
                    <Ionicons name={category.icon as any} size={16} color={isActive ? colors.white : colors.subtext} />
                    <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                      {t(category.labelKey)}
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

            <Text style={styles.listTitle}>{t('calendar.dosTitle')}</Text>
            <View style={styles.actionList}>
              {actionables.dos.map((line) => (
                <View key={`do-${line}`} style={styles.doCard}>
                  <Text style={styles.doText}>✅ {line}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.listTitle}>{t('calendar.dontsTitle')}</Text>
            <View style={styles.actionList}>
              {actionables.donts.map((line) => (
                <View key={`dont-${line}`} style={styles.dontCard}>
                  <Text style={styles.dontText}>❌ {line}</Text>
                </View>
              ))}
            </View>

            <View style={styles.whyBlock}>
              <Text style={styles.whyTitle}>{t('calendar.whyTitle')}</Text>
              <Text style={styles.whyText}>
                {t('calendar.whyTemplate', {
                  reason: selectedSummary.selectedInsight?.reason ?? t('calendar.whyFallback'),
                })}
              </Text>
            </View>

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
                  <Text style={styles.blueprintSectionTitle}>{t('calendar.technicalBreakdown')}</Text>

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
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    headerTitleWrap: {
      gap: 4,
      flex: 1,
      paddingRight: 8,
    },
    headerTitle: {
      color: C.text,
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: 0.3,
      fontFamily: SCORE_FONT,
    },
    headerSubtitle: {
      color: C.subtext,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: UI_FONT,
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
    dontText: {
      color: C.red,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
      fontFamily: UI_FONT,
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
      fontWeight: '700',
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
