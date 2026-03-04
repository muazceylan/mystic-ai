import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Lightbulb } from 'lucide-react-native';
import { AccessibleText } from '../ui';
import { useTheme } from '../../context/ThemeContext';
import { ACCESSIBILITY } from '../../constants/tokens';
import { getMatchBadgePalette } from '../../constants/matchDesignTokens';
import type { AxisDTO, MatchResultKind } from '../../types/match';
import DualComparisonBar from './DualComparisonBar';

interface AxisCardProps {
  axis: AxisDTO;
  leftName: string;
  rightName: string;
}

function badgeProps(result: MatchResultKind) {
  const palette = getMatchBadgePalette(result);
  if (result === 'UYUMLU') {
    return {
      text: 'Uyumlu',
      bg: palette.background,
      border: palette.border,
      color: palette.text,
    };
  }

  if (result === 'DIKKAT') {
    return {
      text: 'Dikkat',
      bg: palette.background,
      border: palette.border,
      color: palette.text,
    };
  }

  return {
    text: 'Gelişim alanı',
    bg: palette.background,
    border: palette.border,
    color: palette.text,
  };
}

export default function AxisCard({ axis, leftName, rightName }: AxisCardProps) {
  const { colors } = useTheme();
  const badge = badgeProps(axis.result);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <AccessibleText style={[styles.title, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          {axis.title}
        </AccessibleText>
        <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}> 
          <AccessibleText style={[styles.badgeText, { color: badge.color }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {badge.text}
          </AccessibleText>
        </View>
      </View>

      <View style={styles.compareRow}>
        <View style={styles.sideCell}>
          <AccessibleText style={[styles.personLabel, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {leftName}
          </AccessibleText>
          <AccessibleText style={[styles.personTrait, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {axis.leftLabel}
          </AccessibleText>
        </View>

        <View style={styles.centerCell}>
          <AccessibleText style={[styles.impactText, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {axis.impactPlain}
          </AccessibleText>
        </View>

        <View style={[styles.sideCell, styles.sideCellRight]}>
          <AccessibleText style={[styles.personLabel, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {rightName}
          </AccessibleText>
          <AccessibleText style={[styles.personTrait, styles.personTraitRight, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {axis.rightLabel}
          </AccessibleText>
        </View>
      </View>

      <DualComparisonBar
        leftName={leftName}
        rightName={rightName}
        leftValue={axis.leftScore}
        rightValue={axis.rightScore}
      />

      <View style={[styles.tipRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}> 
        <Lightbulb size={14} color={colors.violet} />
        <AccessibleText style={[styles.tipText, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          {axis.tipPlain}
        </AccessibleText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  badge: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sideCell: {
    flex: 0.9,
    gap: 4,
  },
  sideCellRight: {
    alignItems: 'flex-end',
  },
  centerCell: {
    flex: 1.1,
  },
  personLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  personTrait: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  personTraitRight: {
    textAlign: 'right',
  },
  impactText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  tipRow: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
});
