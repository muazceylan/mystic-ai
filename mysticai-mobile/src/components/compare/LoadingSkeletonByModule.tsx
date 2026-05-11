import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function LoadingSkeletonByModule() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.block, styles.hero]} />
      <View style={[styles.block, styles.card]} />
      <View style={styles.grid}>
        <View style={[styles.block, styles.metric]} />
        <View style={[styles.block, styles.metric]} />
        <View style={[styles.block, styles.metric]} />
        <View style={[styles.block, styles.metric]} />
      </View>
      <View style={[styles.block, styles.card]} />
      <View style={[styles.block, styles.card]} />
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  isDark: boolean,
) => StyleSheet.create({
  wrap: {
    gap: 10,
  },
  block: {
    borderRadius: 14,
    backgroundColor: isDark ? colors.surfaceAlt : '#EEE8F8',
    borderWidth: 1,
    borderColor: colors.border,
  },
  hero: {
    height: 130,
  },
  card: {
    height: 88,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metric: {
    width: '48.7%',
    height: 108,
  },
});
