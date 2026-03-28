import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, shadowSubtle, spacing, typography } from '../../theme';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import { HomePremiumIconBadge } from './HomePremiumIconBadge';
import type { QuickAction } from './types';

interface QuickActionCardProps {
  action: QuickAction;
  width: number;
  onPress: (action: QuickAction) => void;
}

const CHEVRON_SIZE = spacing.md + spacing.xs;
const HOME_MAX_FONT_SCALE = 1.15;

export function QuickActionCard({ action, width, onPress }: QuickActionCardProps) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
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
        <HomePremiumIconBadge
          iconName={action.iconName}
          contextKey={action.id}
          disabled={isDisabled}
        />
        <View style={styles.trailing}>
          {statusLabel ? (
            <View style={styles.statusPill}>
              <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} style={styles.statusText}>{statusLabel}</Text>
            </View>
          ) : null}
          <Ionicons
            name="chevron-forward"
            size={CHEVRON_SIZE}
            color={isDisabled ? (isDark ? colors.textMuted : '#B7AFCF') : colors.primaryLight}
          />
        </View>
      </View>

      <View style={styles.content}>
        <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} numberOfLines={2} style={styles.title}>{action.title}</Text>
        <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} numberOfLines={1} style={styles.subtitle}>{action.subtitle}</Text>
      </View>
    </Pressable>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    card: {
      height: spacing.xxl * 5 + spacing.xs,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: isDark ? C.surfaceGlassBorder : C.borderLight,
      backgroundColor: C.surfaceGlass,
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
      color: C.text,
    },
    subtitle: {
      ...typography.Caption,
      marginTop: spacing.xxs + 1,
      color: C.subtext,
    },
    statusPill: {
      marginRight: spacing.xs,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xxs,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: isDark ? 'rgba(58,53,85,0.88)' : '#F1ECFF',
    },
    statusText: {
      ...typography.Caption,
      color: isDark ? C.primaryLight : C.primaryDark,
      fontWeight: '600',
    },
  });
}
