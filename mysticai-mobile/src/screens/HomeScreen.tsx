import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useContext } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DailyTransitsCard } from '../components/Home/DailyTransitsCard';
import { GreetingRow } from '../components/Home/GreetingRow';
import { HoroscopeSummaryCard } from '../components/Home/HoroscopeSummaryCard';
import { OracleStatusChip } from '../components/Home/OracleStatusChip';
import { QuickActionGrid } from '../components/Home/QuickActionGrid';
import { SkyHeroCard } from '../components/Home/SkyHeroCard';
import { WeeklyHighlightsCompact } from '../components/Home/WeeklyHighlightsCompact';
import { HomePremiumIconBadge } from '../components/Home/HomePremiumIconBadge';
import type { IconName, QuickAction, WeeklyItem } from '../components/Home/types';
import { useHomeDashboard } from '../hooks/useHomeDashboard';
import { trackEvent } from '../services/analytics';
import { fetchHomeContentBundle, type HomeSection, type CmsBanner } from '../services/homeContent.service';
import { envConfig } from '../config/env';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import {
  HOME_TUTORIAL_TARGET_KEYS,
  SpotlightTarget,
  TUTORIAL_IDS,
  TUTORIAL_SCREEN_KEYS,
  useTutorial,
  useTutorialTrigger,
} from '../features/tutorial';
import { MonetizationQuickBar } from '../features/monetization';
import {
  AppSurfaceHeader,
  SafeScreen,
  SurfaceHeaderIconButton,
} from '../components/ui';
import { radius, shadowSubtle, spacing, typography } from '../theme';
import { useTheme, type ThemeColors } from '../context/ThemeContext';
import { MODULE_ICONS, ACTION_ICONS } from '../constants/icons';

const HOME_VARIANT = 'premium_v3';
const NIGHT_SKY_ROUTE = '/night-sky';
const NOTIFICATIONS_ROUTE = '/notifications';
const TRANSITS_ROUTE_FALLBACK = '/transits-today';
const WEEKLY_ANALYSIS_ROUTE_FALLBACK = '/(tabs)/weekly-analysis';
const HOME_MAX_FONT_SCALE = 1.15;
const HIDDEN_HOME_SECTION_KEYS = new Set([
  'home_numerology_promo',
  'home_compatibility_promo',
  'home_dream_promo',
  'home_spiritual_promo',
]);

const QUICK_ACTION_VISUALS: Record<string, { iconName: IconName; iconColor: string; iconBg: string }> = {
  decisioncompass: {
    iconName: MODULE_ICONS.decision_compass,
    iconColor: '#D4873B',
    iconBg: '#F6E0CD',
  },
  planner: {
    iconName: MODULE_ICONS.planner,
    iconColor: '#6E53E7',
    iconBg: '#E7DDFF',
  },
  spiritual: {
    iconName: MODULE_ICONS.spiritual,
    iconColor: '#A763EE',
    iconBg: '#EFE0FF',
  },
  dream: {
    iconName: MODULE_ICONS.dreams,
    iconColor: '#C14DDD',
    iconBg: '#F6E1FF',
  },
  compatibility: {
    iconName: MODULE_ICONS.compatibility,
    iconColor: '#C4549A',
    iconBg: '#F9E5F4',
  },
};

const WEEKLY_ICON_MAP: Record<string, IconName> = {
  strength: 'flash-outline',
  opportunity: 'sunny-outline',
  threat: ACTION_ICONS.error,
  weakness: ACTION_ICONS.warning,
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

function resolveQuickActionVisual(
  key: string | undefined,
  title: string | undefined,
  fallbackColors: { iconColor: string; iconBg: string },
) {
  const normalizedKey = normalizeToken(key);
  const normalizedTitle = normalizeToken(title);

  const entry = Object.entries(QUICK_ACTION_VISUALS).find(([match]) =>
    normalizedKey.includes(match) || normalizedTitle.includes(match),
  );

  return entry?.[1] ?? {
    iconName: 'apps-outline',
    iconColor: fallbackColors.iconColor,
    iconBg: fallbackColors.iconBg,
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

  if (level === 'high') {
    return 'flash-outline';
  }

  if (level === 'medium') {
    return 'sunny-outline';
  }

  return 'alert-circle-outline';
}

function greetingPrefixByHour(hour: number, locale: 'tr' | 'en'): string {
  if (locale === 'en') {
    if (hour >= 5 && hour <= 11) {
      return 'Good morning';
    }

    if (hour >= 12 && hour <= 17) {
      return 'Good afternoon';
    }

    if (hour >= 18 && hour <= 21) {
      return 'Good evening';
    }

    return 'Good night';
  }

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

function buildGreeting(name: string, hour: number, locale: 'tr' | 'en', genericName: string): string {
  const trimmedName = name.trim();
  const normalizedName = trimmedName.toLowerCase();
  const genericNameNormalized = genericName.trim().toLowerCase();

  if (!trimmedName || normalizedName === 'merhaba' || normalizedName === 'hello' || normalizedName === genericNameNormalized) {
    return locale === 'en' ? 'Hello' : 'Merhaba';
  }

  return `${greetingPrefixByHour(hour, locale)}, ${trimmedName}`;
}

function extractHeroPhase(subtitle: string | undefined, fallbackPhase: string | undefined): string {
  const value = subtitle?.trim();
  if (!value) {
    return fallbackPhase?.trim() || '—';
  }

  const stripped = value
    .replace(/(?:ay\s*faz[ıi]|moon\s*phase)\s*:/i, '')
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

function LoadingBlock({ height, style }: { height: number; style: object }) {
  return <View style={[style, { height }]} />;
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 80;
  const user = useAuthStore((state) => state.user);
  const { reopenTutorialById } = useTutorial();
  const { triggerInitial: triggerInitialTutorials } = useTutorialTrigger(TUTORIAL_SCREEN_KEYS.HOME);
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [cmsHeroBanners, setCmsHeroBanners] = useState<CmsBanner[]>([]);
  const [cmsSections, setCmsSections] = useState<HomeSection[]>([]);
  // CMS içeriği dashboard verisiyle aynı anda paralel yüklenir.
  // true → skeleton göster, false → gerçek içerik veya boş (veri yoksa hiçbir şey render edilmez).
  const [isCmsLoading, setIsCmsLoading] = useState(true);
  const viewTrackedRef = useRef(false);
  const contentLoadedTrackedRef = useRef(false);
  const emptyHeroRefetchTriedRef = useRef(false);
  const tutorialBootstrapRef = useRef<string | null>(null);
  const resolvedLocale = useMemo<'tr' | 'en'>(
    () => ((i18n.resolvedLanguage ?? i18n.language ?? user?.preferredLanguage ?? 'tr').toLowerCase().startsWith('en') ? 'en' : 'tr'),
    [i18n.language, i18n.resolvedLanguage, user?.preferredLanguage],
  );
  const {
    data: dashboard,
    isLoading,
    isFetching,
    isError,
    isOracleLoading,
    refetch,
  } = useHomeDashboard({ user, locale: resolvedLocale });

  useEffect(() => {
    const timer = setInterval(() => {
      const nextHour = new Date().getHours();
      setCurrentHour((prev) => (prev === nextHour ? prev : nextHour));
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Locale değiştiğinde skeleton'ı tekrar göster.
    setIsCmsLoading(true);
    fetchHomeContentBundle(resolvedLocale)
      .then((bundle) => {
        setCmsHeroBanners(bundle.heroBanners);
        setCmsSections(bundle.sections);
      })
      .finally(() => {
        setIsCmsLoading(false);
      });
  }, [resolvedLocale]);

  useEffect(() => {
    const scope = user?.id ? String(user.id) : null;
    if (!scope) {
      tutorialBootstrapRef.current = null;
      return;
    }

    if (tutorialBootstrapRef.current === scope) {
      return;
    }

    tutorialBootstrapRef.current = scope;
    void triggerInitialTutorials();
    const retryTimer = setTimeout(() => {
      void triggerInitialTutorials();
    }, 2200);

    return () => {
      clearTimeout(retryTimer);
    };
  }, [triggerInitialTutorials, user?.id]);

  const displayName = useMemo(() => {
    // Auth store is authoritative (updated immediately on login/link).
    // Oracle backend name is a fallback for when the store has no real name.
    const authName = user?.firstName?.trim() || user?.name?.trim();
    const backendName = dashboard?.user?.name?.trim();
    const usernameFallback = user?.username?.trim();
    return authName || backendName || usernameFallback || t('common.guest');
  }, [dashboard?.user?.name, t, user?.firstName, user?.name, user?.username]);

  const greetingText = useMemo(
    () => buildGreeting(displayName, currentHour, resolvedLocale, t('common.guest')),
    [currentHour, displayName, resolvedLocale, t],
  );

  const avatarUrl = dashboard?.user?.avatarUrl ?? user?.avatarUrl ?? user?.avatarUri ?? null;
  const notificationCount = useNotificationStore((state) => state.unreadCount);

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
      const visual = resolveQuickActionVisual(action.key, action.title, {
        iconColor: colors.primary,
        iconBg: colors.primarySoft,
      });
      const route = toRoute(action.route);
      const available = Boolean(action.available && route);

      return {
        id: action.key?.trim() || `quick-${index + 1}`,
        title: action.title?.trim() || t('homeSurface.quickActions.fallbackTitle'),
        subtitle: action.subtitle?.trim() || t('homeSurface.quickActions.fallbackSubtitle'),
        route: route ?? undefined,
        disabled: !available,
        statusLabel: !available ? t('homeSurface.quickActions.soonBadge') : undefined,
        ...visual,
      };
    });
  }, [colors.primary, colors.primarySoft, dashboard, t]);

  const weeklyItems = useMemo<WeeklyItem[]>(() => {
    if (!dashboard?.weeklyHighlights?.items?.length) {
      return [];
    }

    return dashboard.weeklyHighlights.items.map((item) => ({
      title: item.title?.trim() || t('homeSurface.weekly.fallbackTitle'),
      level: item.level,
      desc: item.desc?.trim() || t('homeSurface.weekly.fallbackDescription'),
      iconName: resolveWeeklyIcon(item.key, item.title, item.level),
    }));
  }, [dashboard, t]);

  const hasToday = Boolean(
    dashboard?.horoscopeSummary?.today?.themeText?.trim() || dashboard?.horoscopeSummary?.today?.adviceText?.trim(),
  );
  const hasWeekly = weeklyItems.length > 0;

  const heroSubtitle = dashboard?.hero?.subtitle?.trim() || '';
  const heroInsight = dashboard?.hero?.insightText?.trim() || '';
  const hasHeroInsight = Boolean(heroInsight);
  const heroCtaText = dashboard?.hero?.ctaText?.trim() || t('homeSurface.skyHero.cta');
  const heroPhase = extractHeroPhase(heroSubtitle, dashboard?.transitsToday?.moonPhase);
  const heroIllumination = extractHeroIllumination(heroSubtitle);

  const todayTheme = dashboard?.horoscopeSummary?.today?.themeText?.trim() || '';
  const todayAdvice = dashboard?.horoscopeSummary?.today?.adviceText?.trim() || '';

  const transitMoonPhase = dashboard?.transitsToday?.moonPhase?.trim() || '';
  const transitMoonSign = dashboard?.transitsToday?.moonSign?.trim() || '';
  const transitRetroCount = dashboard?.transitsToday?.retroCount ?? 0;
  // Fast faz (~1-2sn) tamamlanana kadar true; oracle beklenmez.
  // Oracle ayrı sorguda yüklenirken sayfa zaten görünür durumdadır.
  const initialLoading = !dashboard && isLoading;
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

  const handlePressTutorialHelp = useCallback(() => {
    void reopenTutorialById(TUTORIAL_IDS.HOME_FOUNDATION, 'home');
  }, [reopenTutorialById]);

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
        Alert.alert(t('homeSurface.quickActions.comingSoonTitle'));
        return;
      }

      pushRoute(action.route);
    },
    [pushRoute, t],
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

  const handlePressNumerologyCard = useCallback(() => {
    trackEvent('home_shortcut_click', { shortcut_key: 'numerology', surface: 'feature_row' });
    pushRoute('/numerology?entry_point=home_card');
  }, [pushRoute]);

  const handlePressCompatibilityCard = useCallback(() => {
    trackEvent('home_shortcut_click', { shortcut_key: 'compatibility', surface: 'feature_row' });
    pushRoute('/(tabs)/compatibility');
  }, [pushRoute]);

  const notificationBadgeText = notificationCount > 9 ? '9+' : String(notificationCount);
  const notificationA11y =
    notificationCount > 0
      ? t('homeSurface.header.notificationsUnread', { count: notificationCount })
      : t('profile.menu.notifications');
  const showOracleStatusChip = envConfig.appEnv === 'dev';
  const visibleCmsSections = useMemo(
    () => cmsSections.filter((section) => !HIDDEN_HOME_SECTION_KEYS.has(section.sectionKey)),
    [cmsSections],
  );

  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustKeyboardInsets={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: spacing.xxs,
            paddingBottom: tabBarHeight + spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppSurfaceHeader
          title=""
          variant="home"
          avatarUri={null}
          leftActions={(
            <SpotlightTarget targetKey={HOME_TUTORIAL_TARGET_KEYS.HELP_ENTRY}>
              <SurfaceHeaderIconButton
                iconName="help-circle-outline"
                onPress={handlePressTutorialHelp}
                accessibilityLabel={t('homeSurface.header.helpAccessibility')}
              />
            </SpotlightTarget>
          )}
          rightActions={(
            <>
              <MonetizationQuickBar />
              <SurfaceHeaderIconButton
                iconName="notifications-outline"
                onPress={handlePressNotifications}
                accessibilityLabel={notificationA11y}
                badgeText={notificationCount > 0 ? notificationBadgeText : null}
              />
            </>
          )}
        />

        <GreetingRow text={greetingText} />

        <SpotlightTarget targetKey={HOME_TUTORIAL_TARGET_KEYS.HERO_ENERGY}>
          <SkyHeroCard
            subtitleText={heroSubtitle}
            phase={heroPhase}
            illumination={heroIllumination}
            insight={heroInsight}
            ctaLabel={heroCtaText}
            isLoading={initialLoading || isOracleLoading}
            onPress={handlePressSkyCard}
          />
        </SpotlightTarget>

        {quickActions.length > 0 ? (
          <SpotlightTarget targetKey={HOME_TUTORIAL_TARGET_KEYS.QUICK_ACTIONS}>
            <QuickActionGrid actions={quickActions} onPressAction={handlePressQuickAction} />
          </SpotlightTarget>
        ) : initialLoading ? (
          <SpotlightTarget targetKey={HOME_TUTORIAL_TARGET_KEYS.QUICK_ACTIONS}>
            <View style={styles.quickSkeletonGrid}>
              <LoadingBlock style={styles.loadingBlock} height={spacing.xxl * 4 + spacing.md} />
              <LoadingBlock style={styles.loadingBlock} height={spacing.xxl * 4 + spacing.md} />
            </View>
          </SpotlightTarget>
        ) : null}

        <SpotlightTarget targetKey={HOME_TUTORIAL_TARGET_KEYS.PERSONAL_WIDGET}>
          <View style={styles.featureRow}>
            <Pressable
              onPress={handlePressNumerologyCard}
              accessibilityRole="button"
              accessibilityLabel={t('homeSurface.featureCards.numerology')}
              style={({ pressed }) => [styles.featureCard, pressed && styles.pressed]}
            >
              <View style={styles.featureCardTop}>
                <HomePremiumIconBadge iconName="keypad" contextKey="numerology" />
                <Ionicons name="chevron-forward" size={16} color={colors.primaryLight} />
              </View>
              <View style={styles.featureCardBottom}>
                <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} numberOfLines={1} style={styles.featureCardTitle}>
                  {t('homeSurface.featureCards.numerology')}
                </Text>
                <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} numberOfLines={1} style={styles.featureCardSubtitle}>
                  {t('homeSurface.featureCards.numerologySubtitle')}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={handlePressCompatibilityCard}
              accessibilityRole="button"
              accessibilityLabel={t('homeSurface.featureCards.compatibility')}
              style={({ pressed }) => [styles.featureCard, pressed && styles.pressed]}
            >
              <View style={styles.featureCardTop}>
                <HomePremiumIconBadge iconName="heart-half" contextKey="compatibility" />
                <Ionicons name="chevron-forward" size={16} color={colors.primaryLight} />
              </View>
              <View style={styles.featureCardBottom}>
                <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} numberOfLines={1} style={styles.featureCardTitle}>
                  {t('homeSurface.featureCards.compatibility')}
                </Text>
                <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} numberOfLines={1} style={styles.featureCardSubtitle}>
                  {t('homeSurface.featureCards.compatibilitySubtitle')}
                </Text>
              </View>
            </Pressable>
          </View>
        </SpotlightTarget>

        <HoroscopeSummaryCard
          sign={signName}
          theme={todayTheme}
          advice={todayAdvice}
          isLoading={(initialLoading || isOracleLoading) && !hasToday}
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

        {isCmsLoading ? (
          // CMS verileri yüklenirken alan boyutunda skeleton göster;
          // layout shift yaşanmaz, içerik gelince yerli yerine oturur.
          <>
            <View style={[styles.loadingBlock, styles.cmsSkeletonBanner]} />
            <View style={[styles.loadingBlock, styles.cmsSkeletonSection]} />
          </>
        ) : (
          <>
            {cmsHeroBanners.map((banner) => {
              const bannerRoute = banner.routeKey || banner.fallbackRouteKey;
              return (
                <Pressable
                  key={banner.id}
                  onPress={() => {
                    if (!bannerRoute) return;
                    trackEvent('home_cms_banner_click', { banner_key: banner.bannerKey, placement: banner.placementType });
                    pushRoute(bannerRoute.startsWith('/') ? bannerRoute : `/${bannerRoute}`);
                  }}
                  accessibilityRole={bannerRoute ? 'button' : 'none'}
                  style={({ pressed }) => [styles.cmsBannerCard, (bannerRoute && pressed) ? styles.pressed : undefined]}
                >
                  <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} style={styles.cmsBannerTitle}>{banner.title}</Text>
                  {banner.subtitle ? <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} style={styles.cmsBannerSubtitle}>{banner.subtitle}</Text> : null}
                  {banner.ctaLabel ? <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} style={styles.cmsBannerCta}>{banner.ctaLabel}</Text> : null}
                </Pressable>
              );
            })}

            {visibleCmsSections.map((section) => {
              const sectionRoute = section.routeKey || section.fallbackRouteKey;
              return (
                <Pressable
                  key={section.id}
                  onPress={() => {
                    if (!sectionRoute) return;
                    trackEvent('home_cms_section_click', { section_key: section.sectionKey, type: section.type });
                    pushRoute(sectionRoute.startsWith('/') ? sectionRoute : `/${sectionRoute}`);
                  }}
                  accessibilityRole={sectionRoute ? 'button' : 'none'}
                  style={({ pressed }) => [styles.cmsSectionCard, (sectionRoute && pressed) ? styles.pressed : undefined]}
                >
                  <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} style={styles.cmsSectionTitle}>{section.title}</Text>
                  {section.subtitle ? <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} style={styles.cmsSectionSubtitle}>{section.subtitle}</Text> : null}
                </Pressable>
              );
            })}
          </>
        )}

        {showOracleStatusChip && dashboard?.oracleStatus?.label ? (
          <OracleStatusChip
            label={dashboard.oracleStatus.label}
            enabled={dashboard.oracleStatus.enabled}
          />
        ) : null}

        {showRetry ? (
          <View style={styles.retryWrap}>
            <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} style={styles.retryText}>{t('homeSurface.retry.title')}</Text>
            <Pressable
              onPress={() => {
                void refetch();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('homeSurface.retry.accessibility')}
              hitSlop={{ top: spacing.xs, bottom: spacing.xs, left: spacing.xs, right: spacing.xs }}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} style={styles.retryButtonText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeScreen>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.screenPadding,
    },
    quickSkeletonGrid: {
      marginTop: spacing.cardGap,
      gap: spacing.sm,
    },
    featureRow: {
      marginTop: spacing.cardGap,
      flexDirection: 'row',
      gap: spacing.sm,
    },
    featureCard: {
      flex: 1,
      height: spacing.xxl * 5 + spacing.xs,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: isDark ? C.surfaceGlassBorder : C.borderLight,
      backgroundColor: C.surfaceGlass,
      justifyContent: 'space-between',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      ...shadowSubtle,
    },
    featureCardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    featureCardBottom: {
      paddingRight: spacing.xs,
      minHeight: spacing.xl + spacing.md,
    },
    featureCardTitle: {
      ...typography.Body,
      lineHeight: 20,
      fontWeight: '600',
      color: C.text,
    },
    featureCardSubtitle: {
      ...typography.Caption,
      marginTop: spacing.xxs + 1,
      color: C.subtext,
    },
    loadingBlock: {
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: isDark ? C.surfaceGlassBorder : C.borderLight,
      backgroundColor: C.surfaceGlass,
    },
    retryWrap: {
      marginTop: spacing.sectionGap,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: isDark ? C.surfaceGlassBorder : C.borderLight,
      backgroundColor: C.surfaceGlass,
      paddingHorizontal: spacing.cardPadding,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    retryText: {
      ...typography.Caption,
      color: C.subtext,
    },
    retryButton: {
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: isDark ? 'rgba(123,95,230,0.22)' : C.primarySoft,
    },
    retryButtonText: {
      ...typography.Caption,
      color: C.primary,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.85,
    },
    cmsBannerCard: {
      marginTop: spacing.cardGap,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: isDark ? C.surfaceGlassBorder : C.borderLight,
      backgroundColor: C.surfaceGlass,
      paddingHorizontal: spacing.cardPadding,
      paddingVertical: spacing.lg,
    },
    cmsBannerTitle: {
      ...typography.H2,
      color: C.text,
    },
    cmsBannerSubtitle: {
      ...typography.Body,
      color: C.subtext,
      marginTop: spacing.xs,
    },
    cmsBannerCta: {
      ...typography.Button,
      color: C.primary,
      marginTop: spacing.sm,
    },
    cmsSectionCard: {
      marginTop: spacing.cardGap,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: isDark ? C.surfaceGlassBorder : C.borderLight,
      backgroundColor: C.surfaceGlass,
      paddingHorizontal: spacing.cardPadding,
      paddingVertical: spacing.md,
    },
    cmsSkeletonBanner: {
      marginTop: spacing.cardGap,
      height: 80,
    },
    cmsSkeletonSection: {
      marginTop: spacing.cardGap,
      height: 72,
    },
    cmsSectionTitle: {
      ...typography.H2,
      color: C.text,
    },
    cmsSectionSubtitle: {
      ...typography.Body,
      color: C.subtext,
      marginTop: spacing.xxs,
    },
  });
}
