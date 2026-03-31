import React, { useContext, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  Platform,
  useWindowDimensions,
  StatusBar as NativeStatusBar,
} from 'react-native';
import Constants from 'expo-constants';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { usePathname, useSegments } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { platformColor } from '../../theme';
import { AppSurfaceBackground } from './AppSurfaceBackground';
import { isStandardSurfaceRoute } from './surfaceUtils';

const WEB_MAX_WIDTH = 920;
const WEB_SIDE_PAD = 24;
const IOS_TAB_BAR_BASE_HEIGHT = 54;
const ANDROID_TAB_BAR_BASE_HEIGHT = 64;

/** Expo Router may report pathname as `/dreams` instead of `/(tabs)/dreams`; segments still include `(tabs)`. */
function isTabLayoutRoute(pathname: string, segments: readonly string[]): boolean {
  return segments[0] === '(tabs)' || pathname.startsWith('/(tabs)');
}

function isMainPagerTabRoute(segments: readonly string[]): boolean {
  // These 5 routes are rendered inside `MainTabPager`, which already reserves space for the tab bar.
  // Adding extra bottom compensation here creates a visible empty strip above the tab bar.
  if (segments[0] !== '(tabs)') return false;
  const tab = segments[1] ?? '';
  return tab === 'home'
    || tab === 'discover'
    || tab === 'calendar'
    || tab === 'natal-chart'
    || tab === 'profile';
}

type SafeScreenProps = {
  children: React.ReactNode;
  /**
   * Which edges to apply safe-area insets on.
   * Default: all four edges.
   * SafeScreen automatically compensates for bottom tab bar overlay on tab routes.
   */
  edges?: Edge[];
  /**
   * Custom style applied to the root View.
   * Pass `backgroundColor` to override the theme bg (e.g. for gradient-backed screens).
   */
  style?: ViewStyle;
  /** Wrap children in a managed ScrollView. */
  scroll?: boolean;
  /** Force or disable the standard app background. Defaults to auto by route. */
  showStandardBackground?: boolean;
};

export function useBottomTabBarOffset() {
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const navigatorTabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const isTabRoute = isTabLayoutRoute(pathname, segments);

  return useMemo(() => {
    const fallbackTabBarHeight = isTabRoute
      ? (
          Platform.OS === 'ios'
            ? IOS_TAB_BAR_BASE_HEIGHT + insets.bottom
            : Platform.OS === 'android'
              ? ANDROID_TAB_BAR_BASE_HEIGHT + insets.bottom
              : 0
        )
      : 0;
    const tabBarHeight = Math.max(navigatorTabBarHeight, fallbackTabBarHeight);
    const bottomTabBarOffset = Math.max(0, tabBarHeight - insets.bottom);

    return {
      tabBarHeight,
      navigatorTabBarHeight,
      bottomInset: insets.bottom,
      bottomTabBarOffset,
    };
  }, [insets.bottom, isTabRoute, navigatorTabBarHeight]);
}

/**
 * Universal, platform-independent safe-area wrapper for every screen.
 *
 * On web, children are constrained to a max-width (920px) and centered
 * horizontally to prevent content from stretching edge-to-edge.
 *
 * @example
 * // Standard screen
 * <SafeScreen>{children}</SafeScreen>
 *
 * // Scrollable screen
 * <SafeScreen scroll>{children}</SafeScreen>
 *
 * // Tab screen (no bottom inset — tab bar already provides it)
 * <SafeScreen edges={['top', 'left', 'right']}>{children}</SafeScreen>
 */
export function SafeScreen({
  children,
  edges = ['top', 'left', 'right', 'bottom'],
  style,
  scroll = false,
  showStandardBackground,
}: SafeScreenProps) {
  const { colors } = useTheme();
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { tabBarHeight, bottomTabBarOffset } = useBottomTabBarOffset();
  const { width: windowWidth } = useWindowDimensions();
  const standardBackgroundEnabled = showStandardBackground ?? isStandardSurfaceRoute(pathname);
  const flattenedStyle = StyleSheet.flatten(style) ?? {};
  const { backgroundColor, ...rawContainerStyle } = flattenedStyle;
  const containerStyle = rawContainerStyle as ViewStyle;
  const resolvedBackgroundColor = standardBackgroundEnabled
    ? platformColor('transparent', colors.bg)
    : backgroundColor ?? colors.bg;
  const hasTopEdge = edges.includes('top');
  const hasBottomEdge = edges.includes('bottom');
  const safeAreaEdges = hasTopEdge ? edges.filter((edge) => edge !== 'top') : edges;
  const topInsetFallback = Platform.OS === 'ios'
    ? Math.round(Constants.statusBarHeight ?? 0)
    : (NativeStatusBar.currentHeight ?? 0);
  const resolvedTopInset = hasTopEdge ? Math.max(insets.top, topInsetFallback) : 0;
  const basePaddingTop = typeof containerStyle.paddingTop === 'number' ? containerStyle.paddingTop : 0;
  const basePaddingBottom = typeof containerStyle.paddingBottom === 'number' ? containerStyle.paddingBottom : 0;
  const isTabRoute = isTabLayoutRoute(pathname, segments);
  const isMainPagerTab = isMainPagerTabRoute(segments);
  const bottomTabCompensation = isTabRoute && !isMainPagerTab && tabBarHeight > 0
    ? (hasBottomEdge ? bottomTabBarOffset : tabBarHeight)
    : 0;
  const adjustedContainerStyle: ViewStyle = hasTopEdge
    ? {
        ...containerStyle,
        paddingTop: basePaddingTop + resolvedTopInset,
        paddingBottom: basePaddingBottom + bottomTabCompensation,
      }
    : {
        ...containerStyle,
        paddingBottom: basePaddingBottom + bottomTabCompensation,
      };

  const webContentStyle: ViewStyle | undefined = useMemo(() => {
    if (Platform.OS !== 'web') return undefined;
    return {
      width: '100%',
      maxWidth: Math.min(WEB_MAX_WIDTH, windowWidth - WEB_SIDE_PAD),
      alignSelf: 'center',
    } as ViewStyle;
  }, [windowWidth]);

  const inner = webContentStyle ? (
    <View style={[styles.webInner, webContentStyle]}>{children}</View>
  ) : (
    children
  );

  if (scroll) {
    return (
      <SafeAreaView
        edges={safeAreaEdges}
        style={[styles.container, { backgroundColor: resolvedBackgroundColor }, adjustedContainerStyle]}
      >
        {standardBackgroundEnabled ? <AppSurfaceBackground /> : null}
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          automaticallyAdjustKeyboardInsets={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {inner}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={safeAreaEdges}
      style={[styles.container, { backgroundColor: resolvedBackgroundColor }, adjustedContainerStyle]}
    >
      {standardBackgroundEnabled ? <AppSurfaceBackground /> : null}
      {inner}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webInner: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    gap: 12,
  },
});
