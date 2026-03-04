import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadowSubtle, spacing, typography } from '../../theme';
import type { WeeklyItem } from './types';

interface WeeklyHighlightsCompactProps {
  weekRange?: string;
  items?: WeeklyItem[] | null;
  onPressItem: (item: WeeklyItem) => void;
  onPressAll: () => void;
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
const LINK_HIT_SLOP = { top: 12, bottom: 12, left: 16, right: 16 };

function getBadge(level: WeeklyItem['level']) {
  if (level === 'Yüksek') {
    return {
      bg: colors.highBg,
      text: colors.highText,
    };
  }

  if (level === 'Orta') {
    return {
      bg: colors.warningBg,
      text: colors.warningText,
    };
  }

  return {
    bg: colors.riskBg,
    text: colors.riskText,
  };
}

export function WeeklyHighlightsCompact({ weekRange, items, onPressItem, onPressAll }: WeeklyHighlightsCompactProps) {
  if (!items?.length) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{`Bu Hafta${weekRange ? ` (${weekRange})` : ''}`}</Text>
        <Pressable
          onPress={onPressAll}
          accessibilityRole="button"
          accessibilityLabel="Haftalık görünümü aç"
          hitSlop={LINK_HIT_SLOP}
          style={({ pressed }) => [styles.linkWrap, pressed && styles.pressed]}
        >
          <Text style={styles.linkText}>Haftayı aç</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        {items.slice(0, 3).map((item, index) => {
          const badge = getBadge(item.level);
          return (
            <Pressable
              key={`${item.title}-${index}`}
              onPress={() => onPressItem(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title} haftalık detayını aç`}
              hitSlop={HIT_SLOP}
              style={({ pressed }) => [styles.itemRow, index === 2 && styles.lastRow, pressed && styles.pressed]}
            >
              <View style={styles.itemLeft}>
                <Ionicons name={item.iconName} size={14} color={colors.primary} />
                <View style={styles.itemTextWrap}>
                  <Text numberOfLines={1} style={styles.itemTitle}>{item.title}</Text>
                  <Text numberOfLines={1} style={styles.itemDesc}>{item.desc}</Text>
                </View>
              </View>

              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>{item.level}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.sectionGap,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.H2,
  },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceGlass,
    paddingHorizontal: spacing.cardPadding,
    ...shadowSubtle,
  },
  itemRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    ...typography.Body,
    fontWeight: '700',
  },
  itemDesc: {
    ...typography.Caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  badgeText: {
    ...typography.Caption,
    fontWeight: '700',
  },
  linkWrap: {
    alignSelf: 'flex-start',
    minHeight: spacing.chevronHitArea,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: -spacing.sm,
    justifyContent: 'center',
  },
  linkText: {
    ...typography.Caption,
    color: colors.primary,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.84,
  },
});
