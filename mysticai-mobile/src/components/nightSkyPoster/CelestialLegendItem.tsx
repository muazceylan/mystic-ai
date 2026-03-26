import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { CelestialLegendItemModel } from '../../features/nightSkyPoster/poster.types';
import { getToneColors } from '../../features/nightSkyPoster/poster.utils';

type Props = {
  item: CelestialLegendItemModel;
};

function CelestialLegendItem({ item }: Props) {
  const { colors } = useTheme();
  const tone = getToneColors(item.tone);
  const isPrimary = (item.priority ?? 1) >= 2;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.badge,
          {
            backgroundColor: tone.glow,
            borderColor: tone.border,
          },
        ]}
      >
        <Text style={[styles.symbol, { color: tone.symbol }]}>{item.symbol}</Text>
      </View>

      <View style={styles.textWrap}>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              opacity: isPrimary ? 1 : 0.9,
            },
          ]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text style={[styles.meaning, { color: colors.subtext }]} numberOfLines={2}>
          {item.meaning}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '48.4%',
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  symbol: {
    fontSize: 18,
    fontWeight: '800',
  },
  textWrap: {
    gap: 4,
  },
  title: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  meaning: {
    fontSize: 11.5,
    lineHeight: 16,
  },
});

export default memo(CelestialLegendItem);
