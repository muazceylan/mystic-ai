import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DailyTransitsCard } from '../components/Home/DailyTransitsCard';
import { GreetingRow } from '../components/Home/GreetingRow';
import { HoroscopeSummaryCard } from '../components/Home/HoroscopeSummaryCard';
import { OracleStatusChip } from '../components/Home/OracleStatusChip';
import { QuickActionGrid } from '../components/Home/QuickActionGrid';
import { SkyHeroCard } from '../components/Home/SkyHeroCard';
import { WeeklyHighlightsCompact } from '../components/Home/WeeklyHighlightsCompact';
import type { IconName, QuickAction, WeeklyItem } from '../components/Home/types';
import { useHomeDashboard } from '../hooks/useHomeDashboard';
import { trackEvent } from '../services/analytics';
import { useAuthStore } from '../store/useAuthStore';
import { colors, radius, shadowSubtle, spacing, typography } from '../theme';

const HOME_VARIANT = 'premium_v3';
const NIGHT_SKY_ROUTE = '/night-sky';
const NOTIFICATIONS_ROUTE = '/notifications';
const SETTINGS_ROUTE = '/theme-settings';
const TRANSITS_ROUTE_FALLBACK = '/transits-today';
const WEEKLY_ANALYSIS_ROUTE_FALLBACK = '/(tabs)/weekly-analysis';

const QUICK_ACTION_VISUALS: Record<string, { iconName: IconName; iconColor: string; iconBg: string }> = {
  decisioncompass: {
    iconName: 'compass',
    iconColor: '#D4873B',
    iconBg: '#F6E0CD',
  },
  planner: {
    iconName: 'calendar',
    iconColor: '#6E53E7',
    iconBg: '#E7DDFF',
  },
  spiritual: {
    iconName: 'moon',
    iconColor: '#A763EE',
    iconBg: '#EFE0FF',
  },
  dream: {
    iconName: 'sparkles',
    iconColor: '#C14DDD',
    iconBg: '#F6E1FF',
  },
  compatibility: {
    iconName: 'heart',
    iconColor: '#C4549A',
    iconBg: '#F9E5F4',
  },
};

const WEEKLY_ICON_MAP: Record<string, IconName> = {
  strength: 'flash-outline',
  opportunity: 'sunny-outline',
  threat: 'alert-circle-outline',
  weakness: 'warning-outline',
};

const SIGN_SLUG_MAP: Record<string, string> = {
  aries: 'aries',
  taurus: 'taurus',
  gemini: 'gemini',
  cancer: 'cancer',
  leo: 'leo',
  virgo: 'virgo',
  libra: 'libra',
  scorpio: 'scorpio',
  sagittarius: 'sagittarius',
  capricorn: 'capricorn',
  aquarius: 'aquarius',
  pisces: 'pisces',
  koc: 'aries',
  boga: 'taurus',
  ikizler: 'gemini',
  yengec: 'cancer',
  aslan: 'leo',
  basak: 'virgo',
  terazi: 'libra',
  akrep: 'scorpio',
  yay: 'sagittarius',
  oglak: 'capricorn',
  kova: 'aquarius',
  balik: 'pisces',
};

function normalizeToken(value: string | undefined): string {
  const trMap: Record<string, string> = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
  };

  return (value ?? '')
    .toLowerCase()
    .split('')
    .map((ch) => trMap[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '');
}

function toRoute(route: string | null | undefined): string | null {
  const value = route?.trim();
  if (!value) {
    return null;
  }

  return value.startsWith('/') ? value : `/${value}`;
}

function resolveSignSlug(signName: string | undefined): string {
  const token = normalizeToken(signName);
  return SIGN_SLUG_MAP[token] ?? 'pisces';
}

function resolveDailyHoroscopeRoute(signName: string | undefined): string {
  return `/(tabs)/horoscope/${resolveSignSlug(signName)}?period=daily`;
}

function resolveWeeklyHoroscopeRoute(signName: string | undefined): string {
  return `/(tabs)/horoscope/${resolveSignSlug(signName)}?period=weekly`;
}

function resolveQuickActionVisual(key: string | undefined, title: string | undefined) {
  const normalizedKey = normalizeToken(key);
  const normalizedTitle = normalizeToken(title);

  const entry = Object.entries(QUICK_ACTION_VISUALS).find(([match]) =>
    normalizedKey.includes(match) || normalizedTitle.includes(match),
  );

  return entry?.[1] ?? {
    iconName: 'apps-outline',
    iconColor: colors.primary,
    iconBg: colors.primarySoft,
  };
}

function resolveWeeklyIcon(key: string | undefined, title: string | undefined, level: WeeklyItem['level']): IconName {
  const normalizedKey = normalizeToken(key);
  const normalizedTitle = normalizeToken(title);

  const mappedEntry = Object.entries(WEEKLY_ICON_MAP).find(([match]) =>
    normalizedKey.includes(match) || normalizedTitle.includes(match),
  );

  if (mappedEntry) {
    return mappedEntry[1];
  }

  if (level === 'Yüksek') {
    return 'flash-outline';
  }

  if (level === 'Orta') {
    return 'sunny-outline';
  }

  return 'alert-circle-outline';
}

function greetingPrefixByHour(hour: number): string {
  if (hour >= 5 && hour <= 11) {
    return 'Günaydın';
  }

  if (hour >= 12 && hour <= 17) {
    return 'İyi günler';
  }

  if (hour >= 18 && hour <= 21) {
    return 'İyi akşamlar';
  }

  return 'İyi geceler';
}

function buildGreeting(name: string, hour: number): string {
  if (!name || name.trim().toLowerCase() === 'merhaba') {
    return 'Merhaba';
  }

  return `${greetingPrefixByHour(hour)}, ${name}`;
}

function extractHeroPhase(subtitle: string | undefined, fallbackPhase: string | undefined): string {
  const value = subtitle?.trim();
  if (!value) {
    return fallbackPhase?.trim() || '—';
  }

  const stripped = value
    .replace(/ay\s*faz[ıi]\s*:/i, '')
    .replace(/▸.*$/g, '')
    .replace(/•.*$/g, '')
    .trim();

  return stripped || fallbackPhase?.trim() || '—';
}

function extractHeroIllumination(subtitle: string | undefined): number {
  const match = subtitle?.match(/%(\d{1,3})/);
  const parsed = match?.[1] ? Number.parseInt(match[1], 10) : Number.NaN;

  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
    return parsed;
  }

  return 0;
}

function LoadingBlock({ height }: { height: number }) {
  return <View style={[styles.loadingBlock, { height }]} />;
}

export default function HomeScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  const {
    data: dashboard,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useHomeDashboard({ user });

  useEffect(() => {
    const timer = setInterval(() => {
      const nextHour = new Date().getHours();
      setCurrentHour((prev) => (prev === nextHour ? prev : nextHour));
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  const viewTrackedRef = useRef(false);
  const contentLoadedTrackedRef = useRef(false);
  const emptyHeroRefetchTriedRef = useRef(false);

  const displayName = useMemo(() => {
    const backendName = dashboard?.user?.name?.trim();
    const authName = user?.firstName?.trim() || user?.name?.trim() || user?.username?.trim();
    return backendName || authName || 'Merhaba';
  }, [dashboard?.user?.name, user?.firstName, user?.name, user?.username]);

  const greetingText = useMemo(
    () => buildGreeting(displayName, currentHour),
    [currentHour, displayName],
  );

  const avatarUrl = dashboard?.user?.avatarUrl ?? user?.avatarUrl ?? user?.avatarUri ?? null;
  const notificationCount = Math.max(0, dashboard?.user?.notifications ?? 0);

  const signName = useMemo(() => {
    const fromToday = dashboard?.horoscopeSummary?.today?.signName?.trim();
    const fromWeekly = dashboard?.horoscopeSummary?.weekly?.signName?.trim();
    const fromUser = dashboard?.user?.signName?.trim() || user?.zodiacSign?.trim();
    return fromToday || fromWeekly || fromUser;
  }, [dashboard, user?.zodiacSign]);

  const todayRoute = toRoute(dashboard?.horoscopeSummary?.today?.route) || resolveDailyHoroscopeRoute(signName);
  const weeklyHoroscopeRoute =
    toRoute(dashboard?.horoscopeSummary?.weekly?.routeToWeeklyHoroscope) || resolveWeeklyHoroscopeRoute(signName);
  const weeklyAnalysisRoute = toRoute(dashboard?.weeklyHighlights?.route) || WEEKLY_ANALYSIS_ROUTE_FALLBACK;
  const transitsRoute = toRoute(dashboard?.transitsToday?.route) || TRANSITS_ROUTE_FALLBACK;

  const quickActions = useMemo<QuickAction[]>(() => {
    if (!dashboard?.quickActions?.length) {
      return [];
    }

    return dashboard.quickActions.slice(0, 4).map((action, index) => {
      const visual = resolveQuickActionVisual(action.key, action.title);
      const route = toRoute(action.route);
      const available = Boolean(action.available && route);

      return {
        id: action.key?.trim() || `quick-${index + 1}`,
        title: action.title?.trim() || 'Modül',
        subtitle: action.subtitle?.trim() || 'Hazırlanıyor',
        route: route ?? undefined,
        disabled: !available,
        statusLabel: !available ? 'Yakında' : undefined,
        ...visual,
      };
    });
  }, [dashboard]);

  const weeklyItems = useMemo<WeeklyItem[]>(() => {
    if (!dashboard?.weeklyHighlights?.items?.length) {
      return [];
    }

    return dashboard.weeklyHighlights.items.map((item) => ({
      title: item.title?.trim() || 'Haftalık başlık',
      level: item.level,
      desc: item.desc?.trim() || 'Detaylar hazırlanıyor.',
      iconName: resolveWeeklyIcon(item.key, item.title, item.level),
    }));
  }, [dashboard]);

  const hasToday = Boolean(
    dashboard?.horoscopeSummary?.today?.themeText?.trim() || dashboard?.horoscopeSummary?.today?.adviceText?.trim(),
  );
  const hasWeekly = weeklyItems.length > 0;

  const heroSubtitle = dashboard?.hero?.subtitle?.trim() || '';
  const heroInsight = dashboard?.hero?.insightText?.trim() || '';
  const hasHeroInsight = Boolean(heroInsight);
  const heroCtaText = dashboard?.hero?.ctaText?.trim() || 'Gökyüzünü gör';
  const heroPhase = extractHeroPhase(heroSubtitle, dashboard?.transitsToday?.moonPhase);
  const heroIllumination = extractHeroIllumination(heroSubtitle);

  const todayTheme = dashboard?.horoscopeSummary?.today?.themeText?.trim() || '';
  const todayAdvice = dashboard?.horoscopeSummary?.today?.adviceText?.trim() || '';

  const transitMoonPhase = dashboard?.transitsToday?.moonPhase?.trim() || '';
  const transitMoonSign = dashboard?.transitsToday?.moonSign?.trim() || '';
  const transitRetroCount = dashboard?.transitsToday?.retroCount ?? 0;

  const initialLoading = !dashboard && (isLoading || isFetching);
  const showRetry = isError && !dashboard;

  useEffect(() => {
    emptyHeroRefetchTriedRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (hasHeroInsight) {
      emptyHeroRefetchTriedRef.current = false;
    }
  }, [hasHeroInsight]);

  useEffect(() => {
    if (!dashboard || isFetching || hasHeroInsight || emptyHeroRefetchTriedRef.current) {
      return;
    }
    emptyHeroRefetchTriedRef.current = true;
    void refetch();
  }, [dashboard, hasHeroInsight, isFetching, refetch]);

  useEffect(() => {
    if (viewTrackedRef.current || initialLoading) {
      return;
    }

    viewTrackedRef.current = true;
    trackEvent('home_view', {
      variant: HOME_VARIANT,
      has_today: hasToday,
      has_weekly: hasWeekly,
    });
  }, [hasToday, hasWeekly, initialLoading]);

  useEffect(() => {
    if (contentLoadedTrackedRef.current || !dashboard) {
      return;
    }

    contentLoadedTrackedRef.current = true;
    trackEvent('home_content_loaded', {
      variant: HOME_VARIANT,
      has_today: hasToday,
      has_weekly: hasWeekly,
      quick_actions_count: quickActions.length,
    });
  }, [dashboard, hasToday, hasWeekly, quickActions.length]);

  const pushRoute = useCallback(
    (route: string) => {
      router.push(route as never);
    },
    [router],
  );

  const handlePressNotifications = useCallback(() => {
    pushRoute(NOTIFICATIONS_ROUTE);
  }, [pushRoute]);

  const handlePressSettings = useCallback(() => {
    pushRoute(SETTINGS_ROUTE);
  }, [pushRoute]);

  const handlePressSkyCard = useCallback(() => {
    trackEvent('home_skymap_click', {
      surface: 'hero',
      destination: 'night_sky',
    });
    pushRoute(NIGHT_SKY_ROUTE);
  }, [pushRoute]);

  const handlePressQuickAction = useCallback(
    (action: QuickAction) => {
      const available = Boolean(action.route && !action.disabled);

      trackEvent('home_shortcut_click', {
        shortcut_key: action.id,
        surface: 'quick_grid',
        available,
      });

      if (!available || !action.route) {
        Alert.alert('Yakında geliyor');
        return;
      }

      pushRoute(action.route);
    },
    [pushRoute],
  );

  const handlePressTodayTab = useCallback(() => {
    trackEvent('home_today_cta_click', {
      source: 'tab_today',
      surface: 'horoscope_tabs',
      destination: 'horoscope_daily',
    });
    pushRoute(todayRoute);
  }, [pushRoute, todayRoute]);

  const handlePressWeekTab = useCallback(() => {
    trackEvent('home_weekly_seeall_click', {
      source: 'tab_weekly',
      surface: 'horoscope_tabs',
      destination: 'horoscope_weekly',
    });
    pushRoute(weeklyHoroscopeRoute);
  }, [pushRoute, weeklyHoroscopeRoute]);

  const handlePressHoroscopeDetails = useCallback(() => {
    trackEvent('home_today_cta_click', {
      source: 'details_link',
      surface: 'horoscope_card',
      destination: 'horoscope_daily',
    });
    pushRoute(todayRoute);
  }, [pushRoute, todayRoute]);

  const handlePressTransits = useCallback(() => {
    trackEvent('home_today_transits_click', {
      surface: 'transits_card',
      destination: 'transits_today',
    });
    pushRoute(transitsRoute);
  }, [pushRoute, transitsRoute]);

  const handlePressWeeklyAll = useCallback(() => {
    trackEvent('home_weekly_seeall_click', {
      source: 'section_link',
      surface: 'weekly_section_header',
      destination: 'weekly_analysis',
    });
    pushRoute(weeklyAnalysisRoute);
  }, [pushRoute, weeklyAnalysisRoute]);

  const handlePressWeeklyItem = useCallback(
    (item: WeeklyItem) => {
      trackEvent('home_weekly_item_click', {
        item_key: normalizeToken(item.title) || 'weekly_item',
        surface: 'weekly_section',
        destination: 'weekly_analysis',
      });
      pushRoute(weeklyAnalysisRoute);
    },
    [pushRoute, weeklyAnalysisRoute],
  );

  const notificationBadgeText = notificationCount > 9 ? '9+' : String(notificationCount);
  const notificationA11y =
    notificationCount > 0
      ? `Bildirimler. ${notificationCount > 9 ? '9+' : notificationCount} yeni bildirim`
      : 'Bildirimler';
  const topSafePadding = insets.top + spacing.xxs;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.bgSoft, colors.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View pointerEvents="none" style={styles.blobTopRight} />
      <View pointerEvents="none" style={styles.blobBottomLeft} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topSafePadding,
            paddingBottom: tabBarHeight + spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.headerGradA, colors.headerGradB]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerShell}
        >
          <View style={styles.headerRow}>
            <View style={styles.userRow}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={spacing.lg + spacing.xs} color={colors.primary} />
                </View>
              )}

              <Text numberOfLines={1} style={styles.userName}>{displayName}</Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                onPress={handlePressNotifications}
                accessibilityRole="button"
                accessibilityLabel={notificationA11y}
                hitSlop={{ top: spacing.xs, bottom: spacing.xs, left: spacing.xs, right: spacing.xs }}
                style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressed]}
              >
                <Ionicons name="notifications-outline" size={spacing.lg} color={colors.textPrimary} />
                {notificationCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{notificationBadgeText}</Text>
                  </View>
                ) : null}
              </Pressable>

              <Pressable
                onPress={handlePressSettings}
                accessibilityRole="button"
                accessibilityLabel="Tema ve ayarlar"
                hitSlop={{ top: spacing.xs, bottom: spacing.xs, left: spacing.xs, right: spacing.xs }}
                style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressed]}
              >
                <Ionicons name="sunny-outline" size={spacing.lg} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <GreetingRow text={greetingText} />

        <SkyHeroCard
          subtitleText={heroSubtitle}
          phase={heroPhase}
          illumination={heroIllumination}
          insight={heroInsight}
          ctaLabel={heroCtaText}
          isLoading={initialLoading}
          onPress={handlePressSkyCard}
        />

        {quickActions.length > 0 ? (
          <QuickActionGrid actions={quickActions} onPressAction={handlePressQuickAction} />
        ) : initialLoading ? (
          <View style={styles.quickSkeletonGrid}>
            <LoadingBlock height={spacing.xxl * 4 + spacing.md} />
            <LoadingBlock height={spacing.xxl * 4 + spacing.md} />
          </View>
        ) : null}

        <HoroscopeSummaryCard
          sign={signName}
          theme={todayTheme}
          advice={todayAdvice}
          isLoading={initialLoading && !hasToday}
          onPressToday={handlePressTodayTab}
          onPressWeek={handlePressWeekTab}
          onPressDetails={handlePressHoroscopeDetails}
        />

        <DailyTransitsCard
          phase={transitMoonPhase}
          moonSign={transitMoonSign}
          retroCount={transitRetroCount}
          isLoading={initialLoading && !dashboard}
          onPress={handlePressTransits}
        />

        <WeeklyHighlightsCompact
          weekRange={dashboard?.weeklyHighlights?.rangeText}
          items={weeklyItems}
          onPressItem={handlePressWeeklyItem}
          onPressAll={handlePressWeeklyAll}
        />

        {dashboard?.oracleStatus?.label ? (
          <OracleStatusChip
            label={dashboard.oracleStatus.label}
            enabled={dashboard.oracleStatus.enabled}
          />
        ) : null}

        {showRetry ? (
          <View style={styles.retryWrap}>
            <Text style={styles.retryText}>Veriler hazırlanıyor</Text>
            <Pressable
              onPress={() => {
                void refetch();
              }}
              accessibilityRole="button"
              accessibilityLabel="Ana sayfa verilerini yenile"
              hitSlop={{ top: spacing.xs, bottom: spacing.xs, left: spacing.xs, right: spacing.xs }}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <Text style={styles.retryButtonText}>Yenile</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
  },
  blobTopRight: {
    position: 'absolute',
    top: -80,
    right: -42,
    width: 230,
    height: 230,
    borderRadius: radius.pill,
    backgroundColor: colors.blobA,
  },
  blobBottomLeft: {
    position: 'absolute',
    left: -92,
    bottom: 140,
    width: 260,
    height: 260,
    borderRadius: radius.pill,
    backgroundColor: colors.blobB,
  },
  headerShell: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.md,
    ...shadowSubtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  avatar: {
    width: spacing.xxl * 2,
    height: spacing.xxl * 2,
    borderRadius: radius.pill,
    marginRight: spacing.sm,
    backgroundColor: colors.primarySoft,
  },
  avatarPlaceholder: {
    width: spacing.xxl * 2,
    height: spacing.xxl * 2,
    borderRadius: radius.pill,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  userName: {
    ...typography.H1,
    fontSize: 20,
    lineHeight: 26,
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconBtn: {
    width: spacing.chevronHitArea,
    height: spacing.chevronHitArea,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.headerActionBorder,
    backgroundColor: colors.headerActionBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowSubtle,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -4,
    minWidth: spacing.md + spacing.xxs,
    height: spacing.md + spacing.xxs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxs,
    backgroundColor: colors.badgeBg,
    borderWidth: 1,
    borderColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.Caption,
    color: colors.badgeText,
    fontWeight: '700',
    lineHeight: 14,
    fontSize: 11,
  },
  quickSkeletonGrid: {
    marginTop: spacing.cardGap,
    gap: spacing.sm,
  },
  loadingBlock: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceGlass,
  },
  retryWrap: {
    marginTop: spacing.sectionGap,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceGlass,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  retryText: {
    ...typography.Caption,
    color: colors.textSecondary,
  },
  retryButton: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.primarySoft,
  },
  retryButtonText: {
    ...typography.Caption,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
