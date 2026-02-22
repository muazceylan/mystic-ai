import { useEffect, useMemo, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY } from '../../constants/tokens';
import {
  clearPlannerFullDistributionCache,
  prefetchPlannerFullDistribution,
} from '../../services/lucky-dates.service';
import { useAuthStore } from '../../store/useAuthStore';
import { useNatalChartStore } from '../../store/useNatalChartStore';

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
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const chart = useNatalChartStore((s) => s.chart);
  const prefetchKeyRef = useRef<string | null>(null);
  const plannerLocale = useMemo(
    () => ((i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase().startsWith('en') ? 'en' : 'tr'),
    [i18n.language, i18n.resolvedLanguage],
  );

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
      locale: plannerLocale,
      responseMode: 'GRID_ONLY',
      startDate: currentRange.startDate,
      endDate: currentRange.endDate,
    });

    void prefetchPlannerFullDistribution({
      userId: user.id,
      userGender: user.gender,
      locale: plannerLocale,
      responseMode: 'GRID_ONLY',
      startDate: nextRange.startDate,
      endDate: nextRange.endDate,
    });
  }, [user?.id, user?.gender, chart, plannerLocale]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          ...TYPOGRAPHY.CaptionSmall,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
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
        name="calendar"
        options={{
          title: t('tabs.calendar'),
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
        }}
      />
      <Tabs.Screen
        name="compatibility"
        options={{
          title: t('tabs.compatibility'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'heart-circle' : 'heart-circle-outline'}
              size={24}
              color={color}
            />
          ),
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="natal-chart"
        options={{
          title: t('tabs.natalChart'),
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
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
