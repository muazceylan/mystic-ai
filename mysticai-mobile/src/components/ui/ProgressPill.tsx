import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { SPACING, RADIUS, TYPOGRAPHY, ACCESSIBILITY } from '../../constants/tokens';

interface ProgressPillProps {
  current: number;
  total: number;
  accentColor?: string;
}

export function ProgressPill({ current, total, accentColor }: ProgressPillProps) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  const accent = accentColor ?? colors.primary;

  return (
    <View style={s.container}>
      <View style={s.dots}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[
              s.dot,
              {
                backgroundColor: i < current ? accent : accent + '30',
              },
            ]}
          />
        ))}
      </View>
      <Text
        style={[s.label, { color: accent }]}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {current}/{total}
      </Text>
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      backgroundColor: C.surface,
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
    },
    dots: {
      flexDirection: 'row',
      gap: 4,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    label: {
      ...TYPOGRAPHY.CaptionBold,
    },
  });
}
