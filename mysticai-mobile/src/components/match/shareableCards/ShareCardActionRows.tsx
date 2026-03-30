import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AccessibleText } from '../../ui';
import { ACCESSIBILITY } from '../../../constants/tokens';
import { radius, spacing } from '../../../theme';
import { useTheme } from '../../../context/ThemeContext';
import type { ShareableCardsActionItem } from './types';

interface ActionRowProps {
  actions: ShareableCardsActionItem[];
}

export function ShareCardSecondaryActions({ actions }: ActionRowProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.secondaryRow}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          onPress={action.onPress}
          disabled={action.disabled}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityState={{ disabled: action.disabled, busy: action.loading }}
          style={({ pressed }) => [
            styles.secondaryItem,
            { borderColor: 'rgba(180, 165, 210, 0.32)' },
            pressed && styles.pressed,
            action.disabled && styles.disabled,
          ]}
        >
          {action.loading ? (
            <ActivityIndicator size="small" color={colors.violet} />
          ) : (
            <Ionicons name={action.iconName} size={18} color={colors.violet} />
          )}
          <AccessibleText
            style={[styles.secondaryLabel, { color: colors.text }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={2}
          >
            {action.label}
          </AccessibleText>
        </Pressable>
      ))}
    </View>
  );
}

export function ShareCardPrimaryActions({ actions }: ActionRowProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.primaryRow}>
      {actions.map((action) => {
        const accent = action.tone === 'accent';

        return (
          <Pressable
            key={action.key}
            onPress={action.onPress}
            disabled={action.disabled}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={{ disabled: action.disabled, busy: action.loading }}
            style={({ pressed }) => [
              styles.primaryItem,
              accent
                ? { backgroundColor: colors.violet }
                : { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(180, 165, 210, 0.35)' },
              pressed && styles.pressed,
              action.disabled && styles.disabled,
            ]}
          >
            {action.loading ? (
              <ActivityIndicator size="small" color={accent ? '#FFFFFF' : colors.violet} />
            ) : (
              <Ionicons name={action.iconName} size={17} color={accent ? '#FFFFFF' : colors.violet} />
            )}
            <AccessibleText
              style={[
                styles.primaryLabel,
                { color: accent ? '#FFFFFF' : colors.text },
              ]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {action.label}
            </AccessibleText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  secondaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  secondaryItem: {
    minHeight: 72,
    flex: 1,
    minWidth: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  secondaryLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryItem: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    flexDirection: 'row',
  },
  primaryLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.5,
  },
});
