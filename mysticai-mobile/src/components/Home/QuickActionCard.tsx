import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadowSubtle, spacing, typography } from '../../theme';
import type { QuickAction } from './types';

interface QuickActionCardProps {
  action: QuickAction;
  width: number;
  onPress: (action: QuickAction) => void;
}

const ICON_SIZE = spacing.lg + spacing.xxs;
const CHEVRON_SIZE = spacing.md + spacing.xs;

export function QuickActionCard({ action, width, onPress }: QuickActionCardProps) {
  const isDisabled = Boolean(action.disabled);
  const statusLabel = action.statusLabel?.trim();

  return (
    <Pressable
      onPress={() => onPress(action)}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={statusLabel ? `${action.title}, ${statusLabel}` : `${action.title}, ${action.subtitle}`}
      hitSlop={{
        top: spacing.xs,
        bottom: spacing.xs,
        left: spacing.xs,
        right: spacing.xs,
      }}
      style={({ pressed }) => [
        styles.card,
        { width },
        isDisabled && styles.disabledCard,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconShell, { backgroundColor: action.iconBg }, isDisabled && styles.disabledIconShell]}>
          <Ionicons name={action.iconName} size={ICON_SIZE} color={action.iconColor} />
        </View>
        <View style={styles.trailing}>
          {statusLabel ? (
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={CHEVRON_SIZE} color={isDisabled ? colors.quickCardDisabledChevron : colors.primaryMuted} />
        </View>
      </View>

      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.title}>{action.title}</Text>
        <Text numberOfLines={1} style={styles.subtitle}>{action.subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: spacing.xxl * 5 + spacing.xs,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.quickCardBorder,
    backgroundColor: colors.surfaceGlass,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...shadowSubtle,
  },
  pressed: {
    opacity: 0.93,
    transform: [{ scale: 0.996 }],
  },
  disabledCard: {
    opacity: 0.82,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  iconShell: {
    width: spacing.iconWrap,
    height: spacing.iconWrap,
    borderRadius: radius.icon,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface,
  },
  disabledIconShell: {
    backgroundColor: colors.quickCardDisabledIconBg,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.xs,
    minHeight: spacing.chevronHitArea,
    alignSelf: 'flex-start',
  },
  content: {
    paddingRight: spacing.xs,
    minHeight: spacing.xl + spacing.md,
  },
  title: {
    ...typography.Body,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.Caption,
    marginTop: spacing.xxs + 1,
    color: colors.textSecondary,
  },
  statusPill: {
    marginRight: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.quickCardStatusBg,
  },
  statusText: {
    ...typography.Caption,
    color: colors.primaryDark,
    fontWeight: '600',
  },
});
