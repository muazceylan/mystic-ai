import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, softShadow, spacing, typography } from '../../theme';
import type { WeeklyItem } from './types';
import { WeeklyItemRow } from './WeeklyItemRow';

interface WeeklyHighlightsCardProps {
  weekRange: string;
  items: WeeklyItem[];
  onPressItem: (item: WeeklyItem) => void;
}

export function WeeklyHighlightsCard({ weekRange, items, onPressItem }: WeeklyHighlightsCardProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('homeSurface.weekly.title')}</Text>
        <Text style={styles.date}>{weekRange}</Text>
      </View>

      <View style={styles.card}>
        {items.map((item, index) => (
          <View key={`${item.title}-${index}`}>
            <WeeklyItemRow item={item} isLast={index === items.length - 1} onPress={onPressItem} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.sectionTitle,
  },
  date: {
    ...typography.caption,
    fontWeight: '700',
  },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    ...softShadow,
  },
});
