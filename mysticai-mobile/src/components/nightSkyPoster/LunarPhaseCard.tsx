import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NightSkyPosterModel } from '../../features/nightSkyPoster/poster.types';
import { posterTokens } from '../../features/nightSkyPoster/poster.tokens';
import LunarPhaseItem from './LunarPhaseItem';

type Props = {
  model: NightSkyPosterModel;
  title: string;
};

function LunarPhaseCard({ model, title }: Props) {
  const selectedPhase = useMemo(
    () => model.lunarPhases.find((phase) => phase.selected) ?? model.lunarPhases[0],
    [model.lunarPhases],
  );

  return (
    <LinearGradient
      colors={['rgba(15,20,37,0.92)', 'rgba(10,14,28,0.76)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          {selectedPhase?.description ? (
            <Text style={styles.description} numberOfLines={2} ellipsizeMode="tail">
              {selectedPhase.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.valueWrap}>
          <Text style={styles.valueLabel}>Aydınlık</Text>
          <Text style={styles.value}>%{model.moonIlluminationPercent}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {model.lunarPhases.map((phase) => (
          <LunarPhaseItem key={phase.key} item={phase} />
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: posterTokens.radius.lg,
    borderWidth: 1,
    borderColor: posterTokens.colors.cardBorder,
    paddingHorizontal: posterTokens.spacing.md,
    paddingVertical: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: posterTokens.spacing.sm,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: posterTokens.colors.textPrimary,
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  description: {
    color: posterTokens.colors.textSecondary,
    fontSize: 9.5,
    lineHeight: 13,
  },
  valueWrap: {
    alignItems: 'flex-end',
    gap: 1,
  },
  valueLabel: {
    color: posterTokens.colors.textMuted,
    fontSize: 8.5,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  value: {
    color: posterTokens.colors.gold,
    fontSize: 16,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
    columnGap: 0,
  },
});

export default memo(LunarPhaseCard);
