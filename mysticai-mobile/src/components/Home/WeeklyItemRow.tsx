import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import type { WeeklyItem } from './types';

interface WeeklyItemRowProps {
  item: WeeklyItem;
  isLast?: boolean;
  onPress: (item: WeeklyItem) => void;
}

function badgeStyle(level: WeeklyItem['level']) {
  if (level === 'Yüksek') {
    return {
      container: { backgroundColor: colors.highBg },
      text: { color: colors.highText },
    };
  }

  if (level === 'Orta') {
    return {
      container: { backgroundColor: colors.warningBg },
      text: { color: colors.warningText },
    };
  }

  return {
    container: { backgroundColor: colors.riskBg },
    text: { color: colors.riskText },
  };
}

export function WeeklyItemRow({ item, isLast = false, onPress }: WeeklyItemRowProps) {
  const badge = badgeStyle(item.level);

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.row, isLast && styles.lastRow, pressed && styles.pressed]}
    >
      <View style={styles.leftIcon}>
        <Ionicons name={item.iconName} size={16} color={colors.primary} />
      </View>

      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
        <Text numberOfLines={1} style={styles.desc}>{item.desc}</Text>
      </View>

      <View style={styles.rightWrap}>
        <View style={[styles.badge, badge.container]}>
          <Text style={[styles.badgeText, badge.text]}>{item.level}</Text>
        </View>
        <Ionicons name="chevron-forward" size={17} color={colors.primaryMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  pressed: {
    opacity: 0.84,
  },
  leftIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.iconShell,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.body,
    fontWeight: '700',
  },
  desc: {
    ...typography.caption,
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
  },
  rightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
  },
});
