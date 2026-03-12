import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export function AppSurfaceBackground() {
  const { colors, isDark } = useTheme();
  const baseGradient = isDark
    ? (['#050914', '#0A1222', '#121B2E'] as const)
    : ([colors.bgGrad1, colors.bg] as const);

  const glowGradient = isDark
    ? (['rgba(124,58,237,0.26)', 'rgba(56,189,248,0.09)', 'rgba(2,6,23,0.00)'] as const)
    : (['rgba(123,77,255,0.10)', 'rgba(180,130,255,0.06)', 'rgba(255,255,255,0.00)'] as const);

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
            backgroundColor: isDark ? 'rgba(124,58,237,0.30)' : 'rgba(123,77,255,0.12)',
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.blobBottomLeft,
          {
            backgroundColor: isDark ? 'rgba(56,189,248,0.18)' : 'rgba(180,130,255,0.10)',
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
