import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { TraitAxis } from '../../services/match.api';

export interface TraitBarProps {
  axis: TraitAxis;
  compact?: boolean;
  variant?: 'default' | 'darkCard';
}

function clampScore(score: number) {
  if (Number.isNaN(score)) return 50;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export default function TraitBar({ axis, compact = false, variant = 'default' }: TraitBarProps) {
  const { colors } = useTheme();
  const score = clampScore(axis.score0to100 ?? 50);
  const markerLeft = `${score}%`;
  const palette = variant === 'darkCard'
    ? {
        label: '#EEF2FF',
        note: 'rgba(255,255,255,0.72)',
        trackBg: 'rgba(255,255,255,0.06)',
        trackBorder: 'rgba(255,255,255,0.10)',
        midline: 'rgba(255,255,255,0.18)',
      }
    : {
        label: colors.text,
        note: colors.subtext,
        trackBg: colors.surfaceAlt,
        trackBorder: colors.border,
        midline: colors.border,
      };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.labelsRow}>
        <Text style={[styles.label, { color: palette.label }]} numberOfLines={1}>
          {axis.leftLabel}
        </Text>
        <Text style={[styles.label, styles.labelRight, { color: palette.label }]} numberOfLines={1}>
          {axis.rightLabel}
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: palette.trackBg, borderColor: palette.trackBorder }]}>
        <View style={[styles.midline, { backgroundColor: palette.midline }]} />
        <View style={[styles.fillLeft, { width: `${Math.max(0, 50 - score)}%`, backgroundColor: 'rgba(196,181,253,0.28)' }]} />
        <View style={[styles.fillRight, { width: `${Math.max(0, score - 50)}%`, backgroundColor: 'rgba(59,130,246,0.22)' }]} />
        <View style={[styles.marker, { left: markerLeft as any, borderColor: '#FFFFFF', backgroundColor: '#5B4ACB' }]} />
      </View>

      {!compact && axis.note ? (
        <Text style={[styles.note, { color: palette.note }]} numberOfLines={2}>
          {axis.note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 7,
  },
  containerCompact: {
    gap: 5,
  },
  labelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  labelRight: {
    textAlign: 'right',
  },
  track: {
    height: 12,
    borderRadius: 999,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  fillLeft: {
    position: 'absolute',
    right: '50%',
    top: 0,
    bottom: 0,
  },
  fillRight: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
  },
  midline: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    left: '50%',
    opacity: 0.9,
  },
  marker: {
    position: 'absolute',
    top: -2,
    marginLeft: -6,
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  note: {
    fontSize: 11,
    lineHeight: 16,
  },
});
