import React from 'react';
import { StyleSheet } from 'react-native';
import {
  SafeAreaView,
  Edge,
} from 'react-native-safe-area-context';

type SafeScreenProps = {
  children: React.ReactNode;
  /** Safe area edges - default: all. Use ['top','left','right'] for tab screens to avoid double bottom padding with tab bar */
  edges?: Edge[];
  style?: object;
};

/**
 * Platform-compatible SafeArea wrapper for all screens.
 * Uses react-native-safe-area-context for iOS notch, Android nav bar, and status bar handling.
 */
export function SafeScreen({
  children,
  edges = ['top', 'left', 'right', 'bottom'],
  style,
}: SafeScreenProps) {
  return (
    <SafeAreaView style={[styles.container, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
