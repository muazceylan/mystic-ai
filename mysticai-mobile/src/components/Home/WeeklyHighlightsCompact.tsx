import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius, shadowSubtle, spacing, typography } from '../../theme';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import type { WeeklyItem } from './types';

interface WeeklyHighlightsCompactProps {
  weekRange?: string;
  items?: WeeklyItem[] | null;
  onPressItem: (item: WeeklyItem) => void;
  onPressAll: () => void;
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
const LINK_HIT_SLOP = { top: 12, bottom: 12, left: 16, right: 16 };

function getBadge(level: WeeklyItem['level'], C: ThemeColors) {
  if (level === 'high') {
    return {
      bg: C.successBg,
      text: C.success,
    };
  }

  if (level === 'medium') {
    return {
      bg: C.warningBg,
      text: C.warning,
    };
  }

  return {
    bg: C.redBg,
    text: C.red,
  };
}

export function WeeklyHighlightsCompact({ weekRange, items, onPressItem, onPressAll }: WeeklyHighlightsCompactProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  if (!items?.length) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {`${t('homeSurface.weekly.title')}${weekRange ? ` (${weekRange})` : ''}`}
        </Text>
        <Pressable
          onPress={onPressAll}
          accessibilityRole="button"
          accessibilityLabel={t('homeSurface.weekly.openAccessibility')}
          hitSlop={LINK_HIT_SLOP}
          style={({ pressed }) => [styles.linkWrap, pressed && styles.pressed]}
        >
          <Text style={styles.linkText}>{t('homeSurface.weekly.openCta')}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        {items.slice(0, 3).map((item, index) => {
          const badge = getBadge(item.level, colors);
          return (
            <Pressable
              key={`${item.title}-${index}`}
              onPress={() => onPressItem(item)}
              accessibilityRole="button"
              accessibilityLabel={t('homeSurface.weekly.itemAccessibility', { title: item.title })}
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
                <Text style={[styles.badgeText, { color: badge.text }]}>
                  {t(`homeSurface.weekly.level.${item.level}`)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

    </View>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
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
      color: C.text,
    },
    card: {
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: isDark ? C.surfaceGlassBorder : C.borderLight,
      backgroundColor: C.surfaceGlass,
      paddingHorizontal: spacing.cardPadding,
      ...shadowSubtle,
    },
    itemRow: {
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
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
      color: C.text,
      fontWeight: '700',
    },
    itemDesc: {
      ...typography.Caption,
      color: C.subtext,
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
      color: C.primary,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.84,
    },
  });
}
