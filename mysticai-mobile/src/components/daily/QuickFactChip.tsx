import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/tokens';
import type { DailyTransitsDTO } from '../../types/daily.types';

interface QuickFactChipProps {
  item: DailyTransitsDTO['quickFacts'][number];
}

const FACT_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  moonPhase: 'moon',
  zodiacVirgo: 'sparkles',
  zodiacSign: 'sparkles',
  retro: 'repeat',
};

export function QuickFactChip({ item }: QuickFactChipProps) {
  const { colors, isDark } = useTheme();
  const iconName = FACT_ICON_MAP[item.icon] ?? 'planet';

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#EAE4F8',
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : '#F4EEFF' }]}>
        <Ionicons name={iconName} size={14} color={colors.primary} />
      </View>
      <Text style={[styles.label, { color: colors.subtext }]} numberOfLines={1}>
        {item.label}
      </Text>
      <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
        {item.value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.smMd,
    minHeight: 82,
    gap: SPACING.xsSm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...TYPOGRAPHY.Caption,
    fontSize: 13,
    lineHeight: 16,
  },
  value: {
    ...TYPOGRAPHY.BodyBold,
    fontSize: 16,
    lineHeight: 21,
  },
});

export default QuickFactChip;
