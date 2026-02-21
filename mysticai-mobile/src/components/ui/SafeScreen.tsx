import React from 'react';
import { StyleSheet } from 'react-native';
import {
  SafeAreaView,
  Edge,
} from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

type SafeScreenProps = {
  children: React.ReactNode;
  /** Safe area edges - default: all. Use ['top','left','right'] for tab screens to avoid double bottom padding with tab bar */
  edges?: Edge[];
  style?: object;
};

/**
 * Platform-compatible SafeArea wrapper for all screens.
 * Uses react-native-safe-area-context for iOS notch, Android nav bar, and status bar handling.
 * Applies theme background color so status bar / notch area matches the screen theme.
 */
export function SafeScreen({
  children,
  edges = ['top', 'left', 'right', 'bottom'],
  style,
}: SafeScreenProps) {
  const { colors } = useTheme();

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
});
