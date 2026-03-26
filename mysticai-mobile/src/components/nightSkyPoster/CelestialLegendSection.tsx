import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import type { CelestialLegendItemModel } from '../../features/nightSkyPoster/poster.types';
import CelestialLegendItem from './CelestialLegendItem';

type Props = {
  title: string;
  subtitle: string;
  items: CelestialLegendItemModel[];
};

function CelestialLegendSection({ title, subtitle, items }: Props) {
  const { colors } = useTheme();

  if (!items.length) return null;

  return (
    <View style={[styles.root, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.violetBg }]}>
          <Ionicons name="planet-outline" size={17} color={colors.violet} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {items.map((item) => (
          <CelestialLegendItem key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
});

export default memo(CelestialLegendSection);
