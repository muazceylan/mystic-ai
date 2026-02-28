import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { SPACING, RADIUS } from '../../../constants/tokens';

function ShimmerBlock({ width, height, style }: { width: number | string; height: number; style?: any }) {
  const { colors, isDark } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: RADIUS.sm,
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function HoroscopeHubSkeleton() {
  return (
    <View style={styles.container}>
      <ShimmerBlock width="100%" height={80} style={{ marginBottom: SPACING.lg }} />
      <ShimmerBlock width="40%" height={20} style={{ marginBottom: SPACING.md }} />
      <View style={styles.grid}>
        {Array.from({ length: 12 }).map((_, i) => (
          <ShimmerBlock key={i} width="31%" height={72} style={{ marginBottom: SPACING.sm }} />
        ))}
      </View>
    </View>
  );
}

export function HoroscopeDetailSkeleton() {
  return (
    <View style={styles.container}>
      <ShimmerBlock width="100%" height={44} style={{ marginBottom: SPACING.lg }} />
      <View style={styles.chipRow}>
        <ShimmerBlock width="30%" height={28} />
        <ShimmerBlock width="30%" height={28} />
        <ShimmerBlock width="30%" height={28} />
      </View>
      <ShimmerBlock width="100%" height={80} style={{ marginBottom: SPACING.md, marginTop: SPACING.lg }} />
      <ShimmerBlock width="100%" height={56} style={{ marginBottom: SPACING.sm }} />
      <ShimmerBlock width="100%" height={56} style={{ marginBottom: SPACING.sm }} />
      <ShimmerBlock width="100%" height={56} style={{ marginBottom: SPACING.sm }} />
      <ShimmerBlock width="100%" height={56} style={{ marginBottom: SPACING.sm }} />
      <ShimmerBlock width="100%" height={64} style={{ marginBottom: SPACING.sm }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
