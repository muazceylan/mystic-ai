import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { isAndroid, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export function AppSurfaceBackground() {
  const { colors, isDark } = useTheme();
  const baseGradient: readonly [string, string, ...string[]] = isDark
    ? (isAndroid ? ['#0B1220', '#111827', '#162033'] : ['#050914', '#0A1222', '#121B2E'])
    : (isAndroid ? ['#F4EEFF', '#F8FAFC'] : [colors.bgGrad1, colors.bg]);

  const glowGradient: readonly [string, string, ...string[]] = isDark
    ? (isAndroid
      ? ['rgba(124,58,237,0.16)', 'rgba(56,189,248,0.05)', 'rgba(2,6,23,0.00)']
      : ['rgba(124,58,237,0.26)', 'rgba(56,189,248,0.09)', 'rgba(2,6,23,0.00)'])
    : (isAndroid
      ? ['rgba(123,77,255,0.05)', 'rgba(180,130,255,0.03)', 'rgba(255,255,255,0.00)']
      : ['rgba(123,77,255,0.10)', 'rgba(180,130,255,0.06)', 'rgba(255,255,255,0.00)']);

  return (
    <>
      <LinearGradient
        colors={baseGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={glowGradient}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        pointerEvents="none"
        style={[
          styles.blobTopRight,
          {
            backgroundColor: isDark
              ? (isAndroid ? 'rgba(124,58,237,0.18)' : 'rgba(124,58,237,0.30)')
              : (isAndroid ? 'rgba(123,77,255,0.07)' : 'rgba(123,77,255,0.12)'),
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.blobBottomLeft,
          {
            backgroundColor: isDark
              ? (isAndroid ? 'rgba(56,189,248,0.10)' : 'rgba(56,189,248,0.18)')
              : (isAndroid ? 'rgba(180,130,255,0.06)' : 'rgba(180,130,255,0.10)'),
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  blobTopRight: {
    position: 'absolute',
    top: -80,
    right: -42,
    width: 230,
    height: 230,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
  },
  blobBottomLeft: {
    position: 'absolute',
    left: -92,
    bottom: 140,
    width: 260,
    height: 260,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
  },
});
