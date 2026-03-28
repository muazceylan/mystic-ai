import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import type { NightSkyPosterModel } from '../../features/nightSkyPoster/poster.types';
import LunarPhaseItem from './LunarPhaseItem';

type Props = {
  model: NightSkyPosterModel;
  title: string;
  subtitle: string;
  illuminationLabel: string;
};

function LunarPhasesSection({ model, title, subtitle, illuminationLabel }: Props) {
  const { colors } = useTheme();

  const selectedPhase = useMemo(
    () => model.lunarPhases.find((p) => p.selected) ?? model.lunarPhases[0],
    [model.lunarPhases],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.violetBg }]}>
          <Ionicons name="moon-outline" size={17} color={colors.violet} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>{subtitle}</Text>
        </View>
        <View style={styles.illuminationWrap}>
          <Text style={[styles.illuminationLabel, { color: colors.subtext }]}>{illuminationLabel}</Text>
          <Text style={[styles.illuminationValue, { color: colors.violet }]}>
            %{model.moonIlluminationPercent}
          </Text>
        </View>
      </View>

      {selectedPhase?.description ? (
        <Text style={[styles.description, { color: colors.subtext }]} numberOfLines={3}>
          {selectedPhase.description}
        </Text>
      ) : null}

      <View style={styles.grid}>
        {model.lunarPhases.map((phase) => (
          <LunarPhaseItem key={phase.key} item={phase} />
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
    gap: 12,
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
  illuminationWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  illuminationLabel: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  illuminationValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  description: {
    fontSize: 12.5,
    lineHeight: 19,
    paddingHorizontal: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 0,
  },
});

export default memo(LunarPhasesSection);
