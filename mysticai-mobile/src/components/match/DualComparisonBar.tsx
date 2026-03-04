import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AccessibleText } from '../ui';
import { useTheme } from '../../context/ThemeContext';
import { ACCESSIBILITY } from '../../constants/tokens';

interface DualComparisonBarProps {
  leftName: string;
  rightName: string;
  leftValue: number;
  rightValue: number;
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function DualComparisonBar({
  leftName,
  rightName,
  leftValue,
  rightValue,
}: DualComparisonBarProps) {
  const { colors } = useTheme();
  const left = clamp(leftValue);
  const right = clamp(rightValue);
  const sum = left + right;

  const normalizedLeft = sum > 0 ? Math.round((left / sum) * 100) : 50;
  const normalizedRight = sum > 0 ? 100 - normalizedLeft : 50;

  return (
    <View style={styles.wrap}>
      <View style={[styles.track, { backgroundColor: colors.primarySoftBg, borderColor: colors.border }]}> 
        <View style={[styles.leftFill, { width: `${normalizedLeft}%`, backgroundColor: '#DCCBFA' }]} />
        <View style={[styles.rightFill, { width: `${normalizedRight}%`, backgroundColor: '#9B7BEE' }]} />
      </View>
      <View style={styles.metaRow}>
        <AccessibleText style={[styles.metaLabel, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          {leftName} %{left}
        </AccessibleText>
        <AccessibleText style={[styles.metaLabel, styles.metaLabelRight, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          %{right} {rightName}
        </AccessibleText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  track: {
    minHeight: 12,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  leftFill: {
    height: '100%',
  },
  rightFill: {
    height: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  metaLabelRight: {
    textAlign: 'right',
  },
});
