import React from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

type SafeScreenProps = {
  children: React.ReactNode;
  /**
   * Which edges to apply safe-area insets on.
   * Default: all four edges.
   * Use ['top','left','right'] for tab screens to avoid double bottom padding with tab bar.
   */
  edges?: Edge[];
  /**
   * Custom style applied to the root SafeAreaView.
   * Pass `backgroundColor` to override the theme bg (e.g. for gradient-backed screens).
   */
  style?: ViewStyle;
  /** Wrap children in a managed ScrollView. */
  scroll?: boolean;
};

/**
 * Universal, platform-independent safe-area wrapper for every screen.
 *
 * Handles iOS notch / Dynamic Island, Android status & nav bars.
 * Applies the current theme background by default; override via `style`.
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
 *
 * // Screen with custom / gradient background
 * <SafeScreen style={{ backgroundColor: '#0D3B21' }}>
 *   <LinearGradient ...>{children}</LinearGradient>
 * </SafeScreen>
 */
export function SafeScreen({
  children,
  edges = ['top', 'left', 'right', 'bottom'],
  style,
  scroll = false,
}: SafeScreenProps) {
  const { colors } = useTheme();

  if (scroll) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.bg }, style]}
        edges={edges}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }, style]}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    gap: 12,
  },
});
