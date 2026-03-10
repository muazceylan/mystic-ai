import { useEffect, useMemo, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY } from '../../constants/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  clearPlannerFullDistributionCache,
  prefetchPlannerFullDistribution,
} from '../../services/lucky-dates.service';
import { ensureNatalChartForUser } from '../../services/natalChartBootstrap.service';
import { useAuthStore } from '../../store/useAuthStore';
import { useNatalChartStore } from '../../store/useNatalChartStore';
import { clearHoroscopeCache } from '../../features/horoscope/services/horoscope.service';
import { useHoroscopeStore } from '../../features/horoscope/store/useHoroscopeStore';

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
}

export default function TabsLayout() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const chart = useNatalChartStore((s) => s.chart);
  const isNatalChartStale = useNatalChartStore((s) => s.isStale);
  const setNatalChart = useNatalChartStore((s) => s.setChart);
  const setNatalChartLoading = useNatalChartStore((s) => s.setLoading);
  const setNatalChartError = useNatalChartStore((s) => s.setError);
  const prefetchKeyRef = useRef<string | null>(null);
  const lastDateRef = useRef<string>(toIsoDate(new Date()));

  // Clear daily caches when date changes (app stays open overnight)
  useEffect(() => {
    const interval = setInterval(() => {
      const today = toIsoDate(new Date());
      if (lastDateRef.current !== today) {
        lastDateRef.current = today;
        clearHoroscopeCache();
        useHoroscopeStore.getState().clear();
        clearPlannerFullDistributionCache();
      }
    }, 60_000); // check every minute
    return () => clearInterval(interval);
  }, []);
  const plannerLocale = useMemo(
    () => ((i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase().startsWith('en') ? 'en' : 'tr'),
    [i18n.language, i18n.resolvedLanguage],
  );

  useEffect(() => {
    let active = true;

    if (!user?.id) {
      setNatalChartLoading(false);
      return undefined;
    }

    if (chart && !isNatalChartStale()) {
      setNatalChartLoading(false);
      return undefined;
    }

    setNatalChartLoading(true);
    setNatalChartError(null);

    const bootstrapNatalChart = async () => {
      try {
        const ensuredChart = await ensureNatalChartForUser(user);
        if (!active || !ensuredChart) return;
        setNatalChart(ensuredChart);
      } catch (error: any) {
        if (!active) return;
        const message = typeof error?.response?.data?.message === 'string'
          ? error.response.data.message
          : typeof error?.message === 'string'
            ? error.message
            : null;
        setNatalChartError(message);
      } finally {
        if (active) {
          setNatalChartLoading(false);
        }
      }
    };

    void bootstrapNatalChart();

    return () => {
      active = false;
    };
  }, [
    user,
    chart,
    isNatalChartStale,
    setNatalChart,
    setNatalChartLoading,
    setNatalChartError,
  ]);

  useEffect(() => {
    if (!user?.id || !chart) return;
    const prefetchKey = `${user.id}:${plannerLocale}:${chart.calculatedAt ?? chart.id ?? 'chart'}`;
    if (prefetchKeyRef.current === prefetchKey) return;
    prefetchKeyRef.current = prefetchKey;
    clearPlannerFullDistributionCache();

    const currentMonth = new Date();
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const currentRange = getMonthRange(currentMonth);
    const nextRange = getMonthRange(nextMonth);

    void prefetchPlannerFullDistribution({
      userId: user.id,
      userGender: user.gender,
      maritalStatus: user.maritalStatus,
      locale: plannerLocale,
      responseMode: 'GRID_ONLY',
      startDate: currentRange.startDate,
      endDate: currentRange.endDate,
    });

    void prefetchPlannerFullDistribution({
      userId: user.id,
      userGender: user.gender,
      maritalStatus: user.maritalStatus,
      locale: plannerLocale,
      responseMode: 'GRID_ONLY',
      startDate: nextRange.startDate,
      endDate: nextRange.endDate,
    });
  }, [user?.id, user?.gender, user?.maritalStatus, chart, plannerLocale]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: Platform.OS === 'ios' ? 'absolute' : 'relative',
          left: Platform.OS === 'ios' ? 12 : 0,
          right: Platform.OS === 'ios' ? 12 : 0,
          bottom: Platform.OS === 'ios' ? 10 : 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: Platform.OS === 'ios' ? 7 : 8,
          borderRadius: Platform.OS === 'ios' ? 26 : 0,
          overflow: Platform.OS === 'ios' ? 'hidden' : 'visible',
          shadowColor: '#000',
          shadowOpacity: Platform.OS === 'ios' ? (isDark ? 0.28 : 0.09) : 0.08,
          shadowRadius: Platform.OS === 'ios' ? 28 : 8,
          shadowOffset: { width: 0, height: Platform.OS === 'ios' ? 14 : 3 },
          elevation: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarItemStyle: Platform.OS === 'ios'
          ? { borderRadius: 16, marginHorizontal: 2, marginVertical: 2 }
          : undefined,
        tabBarActiveBackgroundColor: Platform.OS === 'ios'
          ? (isDark ? 'rgba(180,148,255,0.16)' : 'rgba(122,91,234,0.10)')
          : undefined,
        tabBarBackground: () => (
          <View
            pointerEvents="none"
            style={{
              flex: 1,
              borderRadius: Platform.OS === 'ios' ? 26 : 0,
              overflow: 'hidden',
              borderTopWidth: Platform.OS === 'ios' ? 0 : 1,
              borderColor: colors.tabBarBorder,
              backgroundColor: 'transparent',
            }}
          >
            {Platform.OS !== 'web' ? (
              <BlurView
                intensity={Platform.OS === 'ios' ? (isDark ? 78 : 110) : 38}
                tint={isDark ? 'dark' : 'light'}
                experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
                style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
              />
            ) : null}
            {Platform.OS === 'ios' ? (
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.00)']
                    : ['rgba(255,255,255,0.96)', 'rgba(255,255,255,0.54)', 'rgba(255,255,255,0.00)']
                }
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 28 }}
              />
            ) : null}
            <LinearGradient
              colors={
                isDark
                  ? [
                      Platform.OS === 'web' ? 'rgba(17,22,33,0.88)' : 'rgba(20,18,40,0.36)',
                      Platform.OS === 'web' ? 'rgba(17,22,33,0.72)' : 'rgba(20,18,40,0.14)',
                    ]
                  : [
                      Platform.OS === 'web' ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.72)',
                      Platform.OS === 'web' ? 'rgba(249,247,255,0.82)' : 'rgba(248,244,255,0.38)',
                    ]
              }
              style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
            />
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                backgroundColor: isDark
                  ? (Platform.OS === 'ios' ? 'rgba(138,118,220,0.062)' : 'rgba(117,98,199,0.05)')
                  : (Platform.OS === 'ios' ? 'rgba(172,148,252,0.072)' : 'rgba(145,108,234,0.040)'),
              }}
            />
            {Platform.OS === 'ios' ? (
              <View
                style={{
                  position: 'absolute',
                  top: -10,
                  left: 24,
                  width: 150,
                  height: 48,
                  borderRadius: 28,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.34)',
                }}
              />
            ) : null}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 14,
                right: 14,
                height: 1,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.82)',
              }}
            />
            {Platform.OS === 'ios' ? (
              <View
                style={{
                  position: 'absolute',
                  left: 10,
                  right: 10,
                  top: 6,
                  height: 12,
                  borderRadius: 10,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.44)',
                }}
              />
            ) : null}
            {Platform.OS === 'ios' ? (
              <View
                style={{
                  position: 'absolute',
                  left: 12,
                  right: 12,
                  bottom: 8,
                  height: 18,
                  borderRadius: 12,
                  backgroundColor: isDark ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.18)',
                }}
              />
            ) : null}
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                borderRadius: Platform.OS === 'ios' ? 26 : 0,
                borderWidth: 1,
                borderColor: Platform.OS === 'ios'
                  ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(226,214,250,0.68)')
                  : colors.tabBarBorder,
              }}
            />
          </View>
        ),
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          ...TYPOGRAPHY.CaptionSmall,
          marginTop: Platform.OS === 'ios' ? -2 : 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Keşfet',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'compass' : 'compass-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Planlayıcı',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="natal-chart"
        options={{
          title: 'Haritam',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'planet' : 'planet-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="compatibility"
        options={{
          title: 'Uyum',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={24}
              color={color}
            />
          ),
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="decision-compass-tab"
        options={{
          title: 'Karar Pusulası',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'compass' : 'compass-outline'}
              size={24}
              color={color}
            />
          ),
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: 'Uyum Analizi',
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="name-analysis"
        options={{
          title: 'İsim Analizi',
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="name-search"
        options={{
          title: 'İsim Arama',
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="name-favorites"
        options={{
          title: 'Favori İsimler',
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="name-detail/[id]"
        options={{
          title: 'İsim Detayı',
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="dreams"
        options={{
          title: t('tabs.dream'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'moon' : 'moon-outline'}
              size={24}
              color={color}
            />
          ),
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="star-mate"
        options={{
          title: (i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase().startsWith('en')
            ? 'Star Mate'
            : 'Yıldız Eşi',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'sparkles' : 'sparkles-outline'}
              size={24}
              color={color}
            />
          ),
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="horoscope"
        options={{
          title: t('tabs.horoscope'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'star' : 'star-outline'}
              size={24}
              color={color}
            />
          ),
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="spiritual"
        options={{
          title: 'Ruhsal',
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="weekly-analysis"
        options={{
          title: t('home.weeklyAnalysis'),
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="transit-detail"
        options={{
          title: t('home.transitTitle'),
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="daily-transits"
        options={{
          title: t('home.transitTitle'),
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="today-actions"
        options={{
          title: t('home.transitActionItems'),
          tabBarButton: () => null,
        }}
      />
    </Tabs>
  );
}
