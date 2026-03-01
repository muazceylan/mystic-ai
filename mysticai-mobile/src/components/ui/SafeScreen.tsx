import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

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
}: SafeScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const edgeSet = useMemo(() => new Set(edges), [edges]);

  const safeStyle: ViewStyle = useMemo(
    () => ({
      paddingTop: edgeSet.has('top') ? insets.top : 0,
      paddingBottom: edgeSet.has('bottom') ? insets.bottom : 0,
      paddingLeft: edgeSet.has('left') ? insets.left : 0,
      paddingRight: edgeSet.has('right') ? insets.right : 0,
    }),
    [insets, edgeSet],
  );

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
      <View
        style={[styles.container, { backgroundColor: colors.bg }, safeStyle, style]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {inner}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bg }, safeStyle, style]}
    >
      {inner}
    </View>
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
