import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Tabs, usePathname, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import { COLORS } from '../../constants/colors';
import { NAV_ICONS, type IoniconName } from '../../constants/icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  clearPlannerFullDistributionCache,
  prefetchPlannerFullDistribution,
} from '../../services/lucky-dates.service';
import { ensureNatalChartForUser } from '../../services/natalChartBootstrap.service';
import { useAuthStore } from '../../store/useAuthStore';
import { useNatalChartStore } from '../../store/useNatalChartStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { clearHoroscopeCache } from '../../features/horoscope/services/horoscope.service';
import { useHoroscopeStore } from '../../features/horoscope/store/useHoroscopeStore';
import { MainTabPager, type MainTabPagerHandle } from '../../navigation/MainTabPager';
import { MAIN_TAB_ORDER, mainTabIndex } from '../../navigation/tabPagerConfig';
import { useWebViewportBottomInset } from '../../hooks/useWebViewportBottomInset';

const WEB_SIDEBAR_BREAKPOINT = 900;
const WEB_SIDEBAR_EXPANDED_BREAKPOINT = 1220;
const WEB_SIDEBAR_GAP = 20;
const WEB_BRAND_ICON = require('../../../assets/icon.png');
const IOS_TAB_BAR_BASE_HEIGHT = 68;
const ANDROID_TAB_BAR_BASE_HEIGHT = 76;

type WebSidebarItemKey = 'home' | 'discover' | 'calendar' | 'natal-chart' | 'notifications';
type WebSidebarVisualKey = WebSidebarItemKey | 'profile';

type WebSidebarItem = {
  key: WebSidebarItemKey;
  label: string;
  href: string;
  iconActive: IoniconName;
  iconInactive: IoniconName;
  matchSegments: string[];
  mainTabIndex?: number;
  badgeText?: string | null;
};

type WebSidebarIconVisual = {
  gradientLight: [string, string];
  gradientDark: [string, string];
  iconLight: string;
  iconDark: string;
  glowLight: string;
  glowDark: string;
  ringLight: string;
  ringDark: string;
};

const WEB_SIDEBAR_ICON_VISUALS: Record<WebSidebarVisualKey, WebSidebarIconVisual> = {
  home: {
    gradientLight: [COLORS.primaryLight, COLORS.primary700],
    gradientDark: [COLORS.themeDarkPrimaryLight, COLORS.primaryDark],
    iconLight: '#FCFAFF',
    iconDark: '#F5F3FF',
    glowLight: 'rgba(157,78,221,0.20)',
    glowDark: 'rgba(168,85,247,0.28)',
    ringLight: 'rgba(199,132,247,0.30)',
    ringDark: 'rgba(216,180,254,0.34)',
  },
  discover: {
    gradientLight: [COLORS.blue, COLORS.primary],
    gradientDark: [COLORS.themeDarkAccent, COLORS.themeDarkPrimary],
    iconLight: '#F8FAFC',
    iconDark: '#F1F5F9',
    glowLight: 'rgba(46,74,156,0.18)',
    glowDark: 'rgba(96,165,250,0.24)',
    ringLight: 'rgba(157,78,221,0.24)',
    ringDark: 'rgba(168,85,247,0.30)',
  },
  calendar: {
    gradientLight: [COLORS.primary, COLORS.accent],
    gradientDark: [COLORS.themeDarkPrimary, COLORS.themeDarkAccent],
    iconLight: '#FAF7FF',
    iconDark: '#F1F5F9',
    glowLight: 'rgba(157,78,221,0.18)',
    glowDark: 'rgba(96,165,250,0.22)',
    ringLight: 'rgba(157,78,221,0.24)',
    ringDark: 'rgba(168,85,247,0.30)',
  },
  'natal-chart': {
    gradientLight: [COLORS.moonBlue, COLORS.accent],
    gradientDark: [COLORS.themeDarkAccent, COLORS.themeDarkSurface],
    iconLight: '#F8FAFC',
    iconDark: '#E2E8F0',
    glowLight: 'rgba(46,74,156,0.16)',
    glowDark: 'rgba(96,165,250,0.22)',
    ringLight: 'rgba(123,158,199,0.30)',
    ringDark: 'rgba(148,163,184,0.26)',
  },
  notifications: {
    gradientLight: [COLORS.primaryLight, COLORS.accent],
    gradientDark: [COLORS.themeDarkPrimary, COLORS.themeDarkAccent],
    iconLight: '#FAF7FF',
    iconDark: '#F1F5F9',
    glowLight: 'rgba(157,78,221,0.18)',
    glowDark: 'rgba(96,165,250,0.22)',
    ringLight: 'rgba(157,78,221,0.24)',
    ringDark: 'rgba(168,85,247,0.30)',
  },
  profile: {
    gradientLight: [COLORS.primaryLight, COLORS.primary700],
    gradientDark: [COLORS.themeDarkPrimaryLight, COLORS.primaryDark],
    iconLight: '#FCFAFF',
    iconDark: '#F5F3FF',
    glowLight: 'rgba(157,78,221,0.18)',
    glowDark: 'rgba(168,85,247,0.22)',
    ringLight: 'rgba(199,132,247,0.26)',
    ringDark: 'rgba(216,180,254,0.30)',
  },
};

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

function getInitials(displayName: string): string {
  const normalized = displayName.trim();
  if (!normalized) return 'AG';
  const parts = normalized.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function PremiumTabItemVisual({
  activeIcon,
  color,
  focused,
  inactiveIcon,
  isDark,
  label,
  itemOffsetX = 0,
}: {
  activeIcon: IoniconName;
  color: string;
  focused: boolean;
  inactiveIcon: IoniconName;
  isDark: boolean;
  label: string;
  itemOffsetX?: number;
}) {
  const iconName = focused ? activeIcon : inactiveIcon;
  const activeChipGradient: readonly [string, string] = isDark
    ? ['rgba(192,132,252,0.20)', 'rgba(168,85,247,0.07)']
    : ['rgba(255,255,255,0.95)', 'rgba(247,243,252,0.76)'];
  const activeChipBorder = isDark ? 'rgba(192,132,252,0.24)' : 'rgba(157,78,221,0.14)';
  const activeChipInnerBorder = isDark ? 'rgba(233,213,255,0.12)' : 'rgba(255,255,255,0.72)';
  const activeGlow = isDark ? 'rgba(168,85,247,0.14)' : 'rgba(157,78,221,0.08)';
  const indicatorColor = isDark ? 'rgba(192,132,252,0.92)' : 'rgba(157,78,221,0.88)';
  const inactiveLabelColor = isDark ? 'rgba(212,220,236,0.72)' : 'rgba(91,98,120,0.78)';
  const iconShellBackground = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.12)';
  const iconSize = focused ? 18 : 21;

  return (
    <View
      style={[
        layoutStyles.premiumTabItem,
        focused && layoutStyles.premiumTabItemFocused,
        itemOffsetX !== 0 && { transform: [{ translateX: itemOffsetX }] },
      ]}
    >
      <View style={[layoutStyles.premiumTabIconWrap, focused && layoutStyles.premiumTabIconWrapFocused]}>
        {focused ? (
          <>
            <View style={[layoutStyles.premiumTabIconGlow, { backgroundColor: activeGlow }]} />
            <LinearGradient
              colors={activeChipGradient}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={[
                layoutStyles.premiumTabIconChip,
                {
                  borderColor: activeChipBorder,
                  shadowColor: isDark ? COLORS.themeDarkPrimary700 : COLORS.primary700,
                },
              ]}
            >
              <View
                pointerEvents="none"
                style={[
                  layoutStyles.premiumTabIconChipInnerBorder,
                  { borderColor: activeChipInnerBorder },
                ]}
              />
              <Ionicons name={iconName} size={iconSize} color={color} />
            </LinearGradient>
          </>
        ) : (
          <View style={[layoutStyles.premiumTabIconPlain, { backgroundColor: iconShellBackground }]}>
            <Ionicons name={iconName} size={iconSize} color={color} />
          </View>
        )}
      </View>

      <Text
        numberOfLines={1}
        style={[
          layoutStyles.premiumTabLabel,
          { color: focused ? color : inactiveLabelColor },
          focused && layoutStyles.premiumTabLabelFocused,
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          layoutStyles.premiumTabIndicator,
          { backgroundColor: indicatorColor, opacity: focused ? 1 : 0 },
        ]}
      />
    </View>
  );
}

export default function TabsLayout() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const webViewportBottomInset = useWebViewportBottomInset();
  const isAndroid = Platform.OS === 'android';
  const isWeb = Platform.OS === 'web';
  const user = useAuthStore((s) => s.user);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
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
  const bottomInset = Math.max(insets.bottom, isWeb ? webViewportBottomInset : 0);
  const iosTabBarHeight = IOS_TAB_BAR_BASE_HEIGHT + bottomInset;
  const iosTabBarPaddingBottom = Math.max(4, bottomInset - 2);
  const androidTabBarHeight = ANDROID_TAB_BAR_BASE_HEIGHT + bottomInset;
  const tabBarShellGradient: readonly [string, string] = isDark
    ? (
        isAndroid
          ? ['rgba(16,20,31,0.98)', 'rgba(11,15,25,0.96)']
          : [
              Platform.OS === 'web' ? 'rgba(17,22,33,0.94)' : 'rgba(13,18,30,0.82)',
              Platform.OS === 'web' ? 'rgba(9,13,23,0.88)' : 'rgba(10,14,24,0.72)',
            ]
      )
    : (
        isAndroid
          ? ['rgba(255,255,255,0.99)', 'rgba(245,240,251,0.98)']
          : [
              Platform.OS === 'web' ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.88)',
              Platform.OS === 'web' ? 'rgba(248,244,255,0.92)' : 'rgba(245,241,251,0.78)',
            ]
      );
  const tabBarTopLine = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.58)';
  const tabBarSurfaceStroke = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(157,78,221,0.05)';
  const tabBarSurfaceShadow = isDark ? '#020617' : '#5B3BB4';
  const tabBarSheenGradient: readonly [string, string, string] = isDark
    ? ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)', 'rgba(255,255,255,0.00)']
    : ['rgba(255,255,255,0.44)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.00)'];
  const tabBarBackplateGradient: readonly [string, string] = isDark
    ? ['#09111E', '#060B16']
    : ['rgba(255,255,255,0.00)', 'rgba(255,255,255,0.00)'];
  const tabBarSurfaceInset = Platform.OS === 'ios' ? 12 : 10;
  const tabBarSurfaceTopInset = 12;
  const tabBarSurfaceBottomInset = Platform.OS === 'ios' ? Math.max(8, bottomInset * 0.32 + 4) : Math.max(6, bottomInset * 0.18 + 4);
  const showWebSidebar = isWeb && windowWidth >= WEB_SIDEBAR_BREAKPOINT;
  const isExpandedWebSidebar = showWebSidebar && windowWidth >= WEB_SIDEBAR_EXPANDED_BREAKPOINT;
  const webSidebarWidth = showWebSidebar ? (isExpandedWebSidebar ? 286 : 96) : 0;
  const sidebarProfileName = useMemo(() => {
    const authName = user?.firstName?.trim() || user?.name?.trim();
    const usernameFallback = user?.username?.trim();
    return authName || usernameFallback || t('common.guest');
  }, [t, user?.firstName, user?.name, user?.username]);
  const unreadBadgeText = unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : null;

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
    const userId = user.id;
    const userGender = user.gender;
    const maritalStatus = user.maritalStatus;
    const prefetchKey = `${userId}:${plannerLocale}:${chart.calculatedAt ?? chart.id ?? 'chart'}`;
    if (prefetchKeyRef.current === prefetchKey) return;
    prefetchKeyRef.current = prefetchKey;
    clearPlannerFullDistributionCache();

    // Planner prefetch'i home dashboard ile aynı anda yapma;
    // 2 saniye bekleyerek home'un önce yüklenmesine izin ver.
    const timer = setTimeout(() => {
      const currentMonth = new Date();
      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      const currentRange = getMonthRange(currentMonth);
      const nextRange = getMonthRange(nextMonth);

      void prefetchPlannerFullDistribution({
        userId,
        userGender,
        maritalStatus,
        locale: plannerLocale,
        responseMode: 'GRID_ONLY',
        startDate: currentRange.startDate,
        endDate: currentRange.endDate,
      });

      void prefetchPlannerFullDistribution({
        userId,
        userGender,
        maritalStatus,
        locale: plannerLocale,
        responseMode: 'GRID_ONLY',
        startDate: nextRange.startDate,
        endDate: nextRange.endDate,
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [user?.id, user?.gender, user?.maritalStatus, chart, plannerLocale]);

  const pagerRef = useRef<MainTabPagerHandle>(null);
  const pathname = usePathname();
  const lastPagerIdxRef = useRef(0);
  const cleanedPathname = useMemo(() => pathname.replace(/\/+$/, ''), [pathname]);
  const currentRouteSegment = useMemo(() => cleanedPathname.split('/').pop() ?? '', [cleanedPathname]);

  const currentMainIdx = useMemo(() => {
    return mainTabIndex(currentRouteSegment);
  }, [currentRouteSegment]);

  const isMainTabActive = currentMainIdx >= 0;
  // Keep a ref so the pager callback can read the latest value without
  // being recreated on every render (avoids PagerView re-attaching the listener).
  const isMainTabActiveRef = useRef(isMainTabActive);
  isMainTabActiveRef.current = isMainTabActive;

  useEffect(() => {
    if (isMainTabActive && currentMainIdx !== lastPagerIdxRef.current) {
      pagerRef.current?.setPageWithoutAnimation(currentMainIdx);
      lastPagerIdxRef.current = currentMainIdx;
    }
  }, [currentMainIdx, isMainTabActive]);

  const handlePagerPageSelected = useCallback((index: number) => {
    // Guard: ignore native PagerView settle/scroll events while the overlay
    // is hidden (e.g. user navigated to a non-main-tab screen like daily-transits).
    // Without this guard the native pager can fire onPageSelected during the
    // overlay hide transition and navigate back to the home tab unexpectedly.
    if (!isMainTabActiveRef.current) return;
    lastPagerIdxRef.current = index;
    const targetTab = MAIN_TAB_ORDER[index];
    if (targetTab) {
      router.navigate(`/(tabs)/${targetTab}` as any);
    }
  }, []);

  const handleSidebarNavigate = useCallback((href: string, mainIndex?: number) => {
    if (typeof mainIndex === 'number') {
      pagerRef.current?.setPageWithoutAnimation(mainIndex);
      lastPagerIdxRef.current = mainIndex;
    }
    router.navigate(href as any);
  }, []);

  const webSidebarItems = useMemo<WebSidebarItem[]>(
    () => [
      {
        key: 'home',
        label: t('tabs.home'),
        href: '/(tabs)/home',
        iconActive: NAV_ICONS.home.active,
        iconInactive: NAV_ICONS.home.inactive,
        matchSegments: ['home'],
        mainTabIndex: 0,
      },
      {
        key: 'discover',
        label: t('tabs.discover'),
        href: '/(tabs)/discover',
        iconActive: NAV_ICONS.discover.active,
        iconInactive: NAV_ICONS.discover.inactive,
        matchSegments: ['discover'],
        mainTabIndex: 1,
      },
      {
        key: 'calendar',
        label: t('tabs.calendar'),
        href: '/(tabs)/calendar',
        iconActive: NAV_ICONS.calendar.active,
        iconInactive: NAV_ICONS.calendar.inactive,
        matchSegments: ['calendar'],
        mainTabIndex: 2,
      },
      {
        key: 'natal-chart',
        label: t('tabs.natalChart'),
        href: '/(tabs)/natal-chart',
        iconActive: NAV_ICONS.natalChart.active,
        iconInactive: NAV_ICONS.natalChart.inactive,
        matchSegments: ['natal-chart'],
        mainTabIndex: 3,
      },
      {
        key: 'notifications',
        label: t('notifCenter.title'),
        href: '/(tabs)/notifications',
        iconActive: 'notifications',
        iconInactive: 'notifications-outline',
        matchSegments: ['notifications', 'notifications-settings'],
        badgeText: unreadBadgeText,
      },
    ],
    [t, unreadBadgeText],
  );

  const tabBarHeight =
    showWebSidebar ? 0 : (Platform.OS === 'ios' ? iosTabBarHeight : androidTabBarHeight);

  const renderTabBarVisual = useCallback(
    (label: string, activeIcon: IoniconName, inactiveIcon: IoniconName, itemOffsetX = 0) => ({ color, focused }: { color: string; focused: boolean }) => (
      <PremiumTabItemVisual
        activeIcon={activeIcon}
        color={color}
        focused={focused}
        inactiveIcon={inactiveIcon}
        isDark={isDark}
        label={label}
        itemOffsetX={itemOffsetX}
      />
    ),
    [isDark],
  );

  return (
    <View style={layoutStyles.root}>
    {showWebSidebar ? (
      <WebSidebar
        colors={colors}
        currentRouteSegment={currentRouteSegment}
        displayName={sidebarProfileName}
        expanded={isExpandedWebSidebar}
        isDark={isDark}
        items={webSidebarItems}
        onNavigate={handleSidebarNavigate}
        profileLabel={t('tabs.profile')}
      />
    ) : null}

    <View
      style={[
        layoutStyles.contentShell,
        showWebSidebar && {
          marginLeft: webSidebarWidth + WEB_SIDEBAR_GAP,
          marginRight: WEB_SIDEBAR_GAP,
        },
      ]}
    >
    <Tabs
      screenListeners={{
        tabPress: (e) => {
          const target = e.target ?? '';
          for (let i = 0; i < MAIN_TAB_ORDER.length; i++) {
            if (target.startsWith(MAIN_TAB_ORDER[i])) {
              pagerRef.current?.setPageWithoutAnimation(i);
              lastPagerIdxRef.current = i;
              break;
            }
          }
        },
      }}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        lazy: true,
        tabBarHideOnKeyboard: true,
        tabBarStyle: showWebSidebar
          ? layoutStyles.webTabBarHidden
          : {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isAndroid ? colors.tabBarBg : (isDark ? colors.bg : 'transparent'),
              borderTopWidth: 0,
              height: Platform.OS === 'ios' ? iosTabBarHeight : androidTabBarHeight,
              paddingBottom: Platform.OS === 'ios' ? iosTabBarPaddingBottom : Math.max(4, bottomInset),
              paddingTop: 14,
              borderRadius: 0,
              overflow: 'hidden',
              elevation: Platform.OS === 'android' ? 4 : 0,
            },
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
          justifyContent: 'center',
          paddingTop: Platform.OS === 'ios' ? 6 : 4,
          paddingBottom: 4,
        },
        tabBarBackground: () => (showWebSidebar ? null : (
          <View
            pointerEvents="none"
            style={{
              flex: 1,
              overflow: 'visible',
              backgroundColor: isDark ? colors.bg : 'transparent',
            }}
          >
            {isDark ? (
              <LinearGradient
                colors={tabBarBackplateGradient}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={layoutStyles.tabBarAbsoluteFill}
              />
            ) : null}
            <View
              style={[
                layoutStyles.tabBarSurfaceShadow,
                {
                  top: tabBarSurfaceTopInset + 4,
                  left: tabBarSurfaceInset,
                  right: tabBarSurfaceInset,
                  bottom: tabBarSurfaceBottomInset - 1,
                  shadowColor: tabBarSurfaceShadow,
                },
              ]}
            />
            <View
              style={[
                layoutStyles.tabBarSurface,
                {
                  top: tabBarSurfaceTopInset,
                  left: tabBarSurfaceInset,
                  right: tabBarSurfaceInset,
                  bottom: tabBarSurfaceBottomInset,
                  borderColor: colors.tabBarBorder,
                  backgroundColor: isAndroid ? colors.tabBarBg : (isDark ? 'rgba(10,16,28,0.76)' : 'transparent'),
                },
              ]}
            >
              {Platform.OS !== 'web' && !isAndroid ? (
                <BlurView
                  intensity={Platform.OS === 'ios' ? (isDark ? 80 : 112) : 40}
                  tint={isDark ? 'dark' : 'light'}
                  experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
                  style={layoutStyles.tabBarAbsoluteFill}
                />
              ) : null}
              <LinearGradient
                colors={tabBarShellGradient}
                style={layoutStyles.tabBarAbsoluteFill}
              />
              <LinearGradient
                colors={tabBarSheenGradient}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={layoutStyles.tabBarSheen}
              />
              <View style={[layoutStyles.tabBarTopRim, { backgroundColor: tabBarTopLine }]} />
              <View style={[layoutStyles.tabBarInnerStroke, { borderColor: tabBarSurfaceStroke }]} />
            </View>
          </View>
        )),
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          tabBarIcon: renderTabBarVisual(t('tabs.home'), NAV_ICONS.home.active, NAV_ICONS.home.inactive, 4),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: t('tabs.discover'),
          tabBarIcon: renderTabBarVisual(t('tabs.discover'), NAV_ICONS.discover.active, NAV_ICONS.discover.inactive),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('tabs.calendar'),
          tabBarIcon: renderTabBarVisual(t('tabs.calendar'), NAV_ICONS.calendar.active, NAV_ICONS.calendar.inactive),
        }}
      />
      <Tabs.Screen
        name="natal-chart"
        options={{
          title: t('tabs.natalChart'),
          tabBarIcon: renderTabBarVisual(t('tabs.natalChart'), NAV_ICONS.natalChart.active, NAV_ICONS.natalChart.inactive),
        }}
      />
      <Tabs.Screen
        name="compatibility"
        options={{
          title: t('tabs.compatibility'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? NAV_ICONS.compatibility.active : NAV_ICONS.compatibility.inactive}
              size={24}
              color={color}
            />
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="decision-compass-tab"
        options={{
          title: t('surfaceTitles.decisionCompass'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? NAV_ICONS.decisionCompass.active : NAV_ICONS.decisionCompass.inactive}
              size={24}
              color={color}
            />
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="decision-compass-all-categories"
        options={{
          title: t('surfaceTitles.decisionCompassAllCategories'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: t('surfaceTitles.compare'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="name-analysis"
        options={{
          title: t('surfaceTitles.nameAnalysis'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="name-search"
        options={{
          title: t('surfaceTitles.nameSearch'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="name-favorites"
        options={{
          title: t('surfaceTitles.nameFavorites'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="name-detail/[id]"
        options={{
          title: t('surfaceTitles.nameDetail'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: renderTabBarVisual(t('tabs.profile'), NAV_ICONS.profile.active, NAV_ICONS.profile.inactive),
        }}
      />
      <Tabs.Screen
        name="dreams"
        options={{
          title: t('tabs.dream'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? NAV_ICONS.dreams.active : NAV_ICONS.dreams.inactive}
              size={24}
              color={color}
            />
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="star-mate"
        options={{
          title: t('surfaceTitles.starMate'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? NAV_ICONS.starMate.active : NAV_ICONS.starMate.inactive}
              size={24}
              color={color}
            />
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="horoscope"
        options={{
          title: t('tabs.horoscope'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? NAV_ICONS.horoscope.active : NAV_ICONS.horoscope.inactive}
              size={24}
              color={color}
            />
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="spiritual"
        options={{
          title: t('surfaceTitles.spiritual'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="weekly-analysis"
        options={{
          title: t('home.weeklyAnalysis'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="transit-detail"
        options={{
          title: t('home.transitTitle'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="daily-transits"
        options={{
          title: t('home.transitTitle'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="today-actions"
        options={{
          title: t('home.transitActionItems'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('notifCenter.title'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="notifications-settings"
        options={{
          title: t('notifSettings.title'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="theme-settings"
        options={{
          title: t('theme.title'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="premium"
        options={{
          title: t('premium.title'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="link-account"
        options={{
          title: t('linkAccount.title'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="add-person"
        options={{
          title: t('addPerson.title'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="decision-compass-detail"
        options={{
          title: t('decisionCompassDetail.labelFallback'),
          href: null,
        }}
      />
      <Tabs.Screen
        name="night-sky-poster-preview"
        options={{
          title: 'Night Sky Poster',
          href: null,
        }}
      />
      <Tabs.Screen
        name="natal-visuals-preview"
        options={{
          title: 'Natal Visuals',
          href: null,
        }}
      />
    </Tabs>

    {/* PagerView overlay — renders real adjacent screens */}
    <View
      style={[
        layoutStyles.pagerOverlay,
        { bottom: tabBarHeight },
        !isMainTabActive && layoutStyles.pagerHidden,
      ]}
      pointerEvents={isMainTabActive ? 'auto' : 'none'}
    >
      <MainTabPager
        ref={pagerRef}
        initialPage={Math.max(0, currentMainIdx)}
        onPageSelected={handlePagerPageSelected}
      />
    </View>
    </View>
    </View>
  );
}

function WebSidebar({
  colors,
  currentRouteSegment,
  displayName,
  expanded,
  isDark,
  items,
  onNavigate,
  profileLabel,
}: {
  colors: ThemeColors;
  currentRouteSegment: string;
  displayName: string;
  expanded: boolean;
  isDark: boolean;
  items: WebSidebarItem[];
  onNavigate: (href: string, mainIndex?: number) => void;
  profileLabel: string;
}) {
  const profileInitials = getInitials(displayName);
  const isProfileActive = ['profile', 'theme-settings', 'link-account', 'add-person'].includes(currentRouteSegment);

  return (
    <View
      style={[
        layoutStyles.webSidebarFrame,
        { width: expanded ? 286 + WEB_SIDEBAR_GAP : 96 + WEB_SIDEBAR_GAP },
      ]}
    >
      <View
        style={[
          layoutStyles.webSidebarSurface,
          {
            backgroundColor: isDark ? 'rgba(15,18,28,0.96)' : 'rgba(255,255,255,0.86)',
            borderColor: isDark ? 'rgba(139,116,232,0.22)' : 'rgba(168,139,250,0.20)',
            shadowColor: isDark ? '#040612' : '#2E1065',
          },
        ]}
      >
        <LinearGradient
          colors={isDark ? ['rgba(114,92,226,0.28)', 'rgba(114,92,226,0.00)'] : ['rgba(191,169,255,0.45)', 'rgba(191,169,255,0.00)']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={layoutStyles.webSidebarAura}
        />
        <View
          style={[
            layoutStyles.webSidebarOrb,
            {
              backgroundColor: isDark ? 'rgba(93,72,179,0.20)' : 'rgba(206,190,255,0.36)',
            },
          ]}
        />
        <View style={layoutStyles.webSidebarInner}>
          <View style={layoutStyles.webSidebarSections}>
            <View>
            <Pressable
              accessibilityLabel="Astro Guru Home"
              accessibilityRole="button"
              onPress={() => onNavigate('/(tabs)/home', 0)}
              style={({ pressed }) => [
                layoutStyles.webBrandButton,
                !expanded && layoutStyles.webBrandButtonCompact,
                pressed && layoutStyles.webPressed,
              ]}
            >
              <View
                style={[
                  layoutStyles.webBrandMark,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.68)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(165,138,242,0.18)',
                  },
                ]}
              >
                <Image source={WEB_BRAND_ICON} style={layoutStyles.webBrandImage} resizeMode="cover" />
              </View>
              {expanded ? (
                <View style={layoutStyles.webBrandTextWrap}>
                  <Text
                    style={[
                      layoutStyles.webBrandTitle,
                      { color: isDark ? '#F7F4FF' : '#241042' },
                    ]}
                  >
                    Astro Guru
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <View style={layoutStyles.webNavGroup}>
              {items.map((item) => (
                <WebSidebarNavButton
                  key={item.key}
                  active={item.matchSegments.includes(currentRouteSegment)}
                  badgeText={item.badgeText}
                  colors={colors}
                  expanded={expanded}
                  iconActive={item.iconActive}
                  iconInactive={item.iconInactive}
                  isDark={isDark}
                  label={item.label}
                  visualKey={item.key}
                  onPress={() => onNavigate(item.href, item.mainTabIndex)}
                />
              ))}
            </View>
            </View>
            <WebSidebarNavButton
              active={isProfileActive}
              colors={colors}
              expanded={expanded}
              iconActive={NAV_ICONS.profile.active}
              iconInactive={NAV_ICONS.profile.inactive}
              isDark={isDark}
              label={expanded ? displayName : profileLabel}
              visualKey="profile"
              leadingCustom={(
                <LinearGradient
                  colors={isDark ? ['#866CF8', '#35225F'] : ['#F3EBFF', '#DDD0FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={layoutStyles.webProfileAvatar}
                >
                  <Text
                    style={[
                      layoutStyles.webProfileInitials,
                      { color: isDark ? '#FFFFFF' : '#5A35C6' },
                    ]}
                  >
                    {profileInitials}
                  </Text>
                </LinearGradient>
              )}
              metaText={expanded ? profileLabel : undefined}
              onPress={() => onNavigate('/(tabs)/profile', 4)}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function WebSidebarNavButton({
  active,
  badgeText,
  colors,
  expanded,
  iconActive,
  iconInactive,
  isDark,
  label,
  leadingCustom,
  metaText,
  onPress,
  visualKey,
}: {
  active: boolean;
  badgeText?: string | null;
  colors: ThemeColors;
  expanded: boolean;
  iconActive: IoniconName;
  iconInactive: IoniconName;
  isDark: boolean;
  label: string;
  leadingCustom?: React.ReactNode;
  metaText?: string;
  onPress: () => void;
  visualKey: WebSidebarVisualKey;
}) {
  const textColor = active ? (isDark ? '#FAF8FF' : '#2D125F') : (isDark ? '#F4F1FF' : '#24133F');
  const metaColor = active ? 'rgba(255,255,255,0.82)' : (isDark ? 'rgba(239,234,255,0.66)' : 'rgba(84,56,132,0.58)');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        layoutStyles.webNavButton,
        !expanded && layoutStyles.webNavButtonCompact,
        active && layoutStyles.webNavButtonActive,
        active && !expanded && layoutStyles.webNavButtonActiveCompact,
        pressed && layoutStyles.webPressed,
      ]}
    >
      {active ? (
        <LinearGradient
          colors={isDark ? ['rgba(140,112,255,0.32)', 'rgba(75,47,148,0.20)'] : ['rgba(153,118,255,0.20)', 'rgba(255,255,255,0.94)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      <View
        style={layoutStyles.webNavIconWrap}
      >
        {leadingCustom ?? (
          <WebSidebarPremiumIcon
            active={active}
            iconName={active ? iconActive : iconInactive}
            isDark={isDark}
            visualKey={visualKey}
          />
        )}
      </View>

      {expanded ? (
        <View style={layoutStyles.webNavLabelWrap}>
          <Text numberOfLines={1} style={[layoutStyles.webNavLabel, { color: textColor }]}>
            {label}
          </Text>
          {metaText ? (
            <Text numberOfLines={1} style={[layoutStyles.webNavMeta, { color: metaColor }]}>
              {metaText}
            </Text>
          ) : null}
        </View>
      ) : null}

      {badgeText ? (
        <View
          style={[
            expanded ? layoutStyles.webNavBadgeInline : layoutStyles.webNavBadgeFloating,
            {
              backgroundColor: active ? '#FFFFFF' : colors.primary,
            },
          ]}
        >
          <Text
            style={[
              layoutStyles.webNavBadgeText,
              { color: active ? colors.primary700 : '#FFFFFF' },
            ]}
          >
            {badgeText}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function WebSidebarPremiumIcon({
  active,
  iconName,
  isDark,
  visualKey,
}: {
  active: boolean;
  iconName: IoniconName;
  isDark: boolean;
  visualKey: WebSidebarVisualKey;
}) {
  const visual = WEB_SIDEBAR_ICON_VISUALS[visualKey];
  const shellSize = 42;
  const glowSize = 54;
  const innerInset = 5;
  const iconSize = 18;

  return (
    <View style={[layoutStyles.webPremiumIconWrap, { width: glowSize, height: glowSize }]}>
      <View
        style={[
          layoutStyles.webPremiumIconGlow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: active
              ? (isDark ? visual.glowDark : visual.glowLight)
              : (isDark ? 'rgba(96,165,250,0.08)' : 'rgba(157,78,221,0.08)'),
          },
        ]}
      />
      <LinearGradient
        colors={isDark ? visual.gradientDark : visual.gradientLight}
        start={{ x: 0.15, y: 0.05 }}
        end={{ x: 0.9, y: 1 }}
        style={[
          layoutStyles.webPremiumIconShell,
          {
            width: shellSize,
            height: shellSize,
            borderRadius: shellSize / 2,
            borderColor: isDark ? visual.ringDark : visual.ringLight,
            opacity: active ? 1 : 0.96,
          },
        ]}
      >
        <View
          style={[
            layoutStyles.webPremiumIconInner,
            {
              top: innerInset,
              right: innerInset,
              bottom: innerInset,
              left: innerInset,
              borderRadius: (shellSize - innerInset * 2) / 2,
              backgroundColor: isDark ? 'rgba(2,6,23,0.84)' : 'rgba(94,66,187,0.94)',
              borderColor: isDark ? 'rgba(216,180,254,0.18)' : 'rgba(255,255,255,0.26)',
            },
          ]}
        >
          <Ionicons
            name={iconName}
            size={iconSize}
            color={isDark ? visual.iconDark : visual.iconLight}
          />
        </View>
        <View
          style={[
            layoutStyles.webPremiumIconSheen,
            {
              width: shellSize * 0.44,
              height: shellSize * 0.2,
              borderRadius: shellSize * 0.15,
            },
          ]}
        />
      </LinearGradient>
    </View>
  );
}

const layoutStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  contentShell: {
    flex: 1,
  },
  pagerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  pagerHidden: {
    opacity: 0,
    zIndex: -1,
  },
  premiumTabItem: {
    width: 70,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  premiumTabItemFocused: {
    transform: [{ translateY: 0 }],
  },
  premiumTabIconWrap: {
    width: 48,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTabIconWrapFocused: {
    marginTop: 2,
    marginBottom: 4,
  },
  premiumTabIconGlow: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  premiumTabIconChip: {
    width: 34,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  premiumTabIconChipInnerBorder: {
    position: 'absolute',
    top: 1,
    right: 1,
    bottom: 1,
    left: 1,
    borderRadius: 13,
    borderWidth: 1,
  },
  premiumTabIconPlain: {
    width: 34,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTabLabel: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 0.1,
    marginTop: 2,
  },
  premiumTabLabelFocused: {
    fontWeight: '800',
  },
  premiumTabIndicator: {
    width: 18,
    height: 3,
    borderRadius: 999,
    marginTop: 6,
  },
  webTabBarHidden: {
    display: 'none',
  },
  tabBarAbsoluteFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  tabBarSurfaceShadow: {
    position: 'absolute',
    borderRadius: 28,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  tabBarSurface: {
    position: 'absolute',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
  },
  tabBarSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
  },
  tabBarTopRim: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
  },
  tabBarInnerStroke: {
    position: 'absolute',
    top: 1,
    right: 1,
    bottom: 1,
    left: 1,
    borderRadius: 27,
    borderWidth: 1,
  },
  webSidebarFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 30,
  },
  webSidebarSurface: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.16,
    shadowRadius: 36,
    elevation: 18,
  },
  webSidebarAura: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    height: 220,
  },
  webSidebarOrb: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    right: -48,
    top: 132,
  },
  webSidebarInner: {
    flex: 1,
    paddingLeft: 6,
    paddingRight: 10,
    paddingTop: 14,
    paddingBottom: 14,
  },
  webSidebarSections: {
    flex: 1,
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  webBrandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 6,
    paddingVertical: 10,
    borderRadius: 24,
  },
  webBrandButtonCompact: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  webBrandMark: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#5930C5',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
  },
  webBrandImage: {
    width: '152%',
    height: '152%',
    transform: [{ translateX: -2 }, { translateY: 2 }],
  },
  webBrandTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  webBrandTitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  webNavGroup: {
    marginTop: 18,
    gap: 8,
  },
  webNavButton: {
    position: 'relative',
    minHeight: 60,
    borderRadius: 22,
    width: '100%',
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  webNavButtonCompact: {
    width: 64,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  webNavButtonActive: {
    borderWidth: 1,
    borderColor: 'rgba(152,118,248,0.18)',
    shadowColor: '#7248F7',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  webNavButtonActiveCompact: {
    borderRadius: 24,
  },
  webNavIconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webNavLabelWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: 8,
  },
  webNavLabel: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  webNavMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  webNavBadgeInline: {
    minWidth: 26,
    paddingHorizontal: 8,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webNavBadgeFloating: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webNavBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
  webProfileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webPremiumIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webPremiumIconGlow: {
    position: 'absolute',
  },
  webPremiumIconShell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  webPremiumIconInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  webPremiumIconSheen: {
    position: 'absolute',
    top: 5,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  webProfileInitials: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
  },
  webPressed: {
    transform: [{ scale: 0.985 }],
  },
});
