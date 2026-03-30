import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AccessibleText, Skeleton } from '../../ui';
import { ACCESSIBILITY } from '../../../constants/tokens';
import { radius, spacing } from '../../../theme';
import { useTheme } from '../../../context/ThemeContext';
import type { ShareableCardsViewState } from './types';

interface ShareableCardsStateCardProps {
  state: Exclude<ShareableCardsViewState, 'ready'>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
}

export function ShareableCardsStateCard({
  state,
  title,
  description,
  actionLabel,
  onAction,
  actionLoading = false,
}: ShareableCardsStateCardProps) {
  const { colors } = useTheme();

  if (state === 'loading') {
    return (
      <View style={styles.shell}>
        <View style={styles.loadingCard}>
          <Skeleton height={18} width="34%" style={styles.loadingCenter} />
          <Skeleton height={28} width="56%" style={styles.loadingCenter} />
          <Skeleton height={92} borderRadius={22} />
          <View style={styles.loadingMetrics}>
            <Skeleton height={72} borderRadius={18} style={styles.loadingMetric} />
            <Skeleton height={72} borderRadius={18} style={styles.loadingMetric} />
            <Skeleton height={72} borderRadius={18} style={styles.loadingMetric} />
          </View>
          <Skeleton height={72} borderRadius={20} />
        </View>

        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
          <AccessibleText
            style={styles.descriptionLight}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {description}
          </AccessibleText>
        </View>
      </View>
    );
  }

  const iconName = state === 'error' ? 'alert-circle-outline' : 'sparkles-outline';

  return (
    <View style={styles.shell}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconName} size={28} color="rgba(255,255,255,0.85)" />
      </View>

      <AccessibleText
        style={styles.titleLight}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {title}
      </AccessibleText>
      <AccessibleText
        style={styles.descriptionLight}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {description}
      </AccessibleText>

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          disabled={actionLoading}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && styles.pressed,
            actionLoading && styles.disabled,
          ]}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color={colors.violet} />
          ) : (
            <Ionicons name="refresh-outline" size={18} color={colors.violet} />
          )}
          <AccessibleText
            style={[styles.actionText, { color: colors.violet }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {actionLabel}
          </AccessibleText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 380,
    gap: spacing.md,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleLight: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    color: 'rgba(255, 255, 255, 0.92)',
  },
  descriptionLight: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  actionBtn: {
    marginTop: spacing.xs,
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  actionText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  loadingCard: {
    width: '100%',
    gap: spacing.md,
  },
  loadingCenter: {
    alignSelf: 'center',
  },
  loadingMetrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  loadingMetric: {
    flex: 1,
  },
  loadingFooter: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.6,
  },
});
