import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, subtleShadow, typography } from '../../theme';
import type { IconName } from './types';

export interface QuickShortcutItem {
  id: string;
  title: string;
  iconName: IconName;
  disabled?: boolean;
  statusLabel?: string;
}

interface QuickShortcutsRowProps {
  items: QuickShortcutItem[];
  onPressItem: (item: QuickShortcutItem) => void;
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

export function QuickShortcutsRow({ items, onPressItem }: QuickShortcutsRowProps) {
  if (!items.length) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Kısayollar</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {items.map((item) => (
          <Pressable
            key={item.id}
            disabled={item.disabled}
            onPress={() => onPressItem(item)}
            accessibilityRole="button"
            accessibilityLabel={
              item.disabled ? `${item.title}, yakında geliyor` : `${item.title} kısayolunu aç`
            }
            hitSlop={HIT_SLOP}
            style={({ pressed }) => [
              styles.itemCard,
              item.disabled && styles.itemCardDisabled,
              pressed && !item.disabled && styles.pressed,
            ]}
          >
            <View style={styles.iconShell}>
              <Ionicons name={item.iconName} size={16} color={colors.primary} />
            </View>
            <View style={styles.itemTextWrap}>
              <Text numberOfLines={1} style={styles.itemTitle}>{item.title}</Text>
              {item.disabled ? (
                <Text numberOfLines={1} style={styles.statusText}>{item.statusLabel ?? 'Yakında'}</Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    fontSize: 18,
    marginBottom: spacing.sm,
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.screenPadding,
  },
  itemCard: {
    minWidth: 124,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    ...subtleShadow,
  },
  itemCardDisabled: {
    opacity: 0.58,
  },
  iconShell: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.iconShell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextWrap: {
    flexShrink: 1,
  },
  itemTitle: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
    flexShrink: 1,
  },
  statusText: {
    ...typography.caption,
    color: colors.primaryMuted,
    fontSize: 10,
    marginTop: 1,
  },
  pressed: {
    opacity: 0.84,
  },
});
