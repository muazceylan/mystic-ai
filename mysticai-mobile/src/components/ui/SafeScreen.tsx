import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, Platform, useWindowDimensions } from 'react-native';
import { usePathname } from 'expo-router';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { AppSurfaceBackground } from './AppSurfaceBackground';
import { isStandardSurfaceRoute } from './surfaceUtils';

const WEB_MAX_WIDTH = 920;
const WEB_SIDE_PAD = 24;

type SafeScreenProps = {
  children: React.ReactNode;
  /**
   * Which edges to apply safe-area insets on.
   * Default: all four edges.
   * Use ['top','left','right'] for tab screens to avoid double bottom padding with tab bar.
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
  const { width: windowWidth } = useWindowDimensions();
  const standardBackgroundEnabled = showStandardBackground ?? isStandardSurfaceRoute(pathname);
  const flattenedStyle = StyleSheet.flatten(style) ?? {};
  const { backgroundColor, ...containerStyle } = flattenedStyle;
  const resolvedBackgroundColor = standardBackgroundEnabled ? 'transparent' : backgroundColor ?? colors.bg;

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
        edges={edges}
        style={[styles.container, { backgroundColor: resolvedBackgroundColor }, containerStyle]}
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
      edges={edges}
      style={[styles.container, { backgroundColor: resolvedBackgroundColor }, containerStyle]}
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
