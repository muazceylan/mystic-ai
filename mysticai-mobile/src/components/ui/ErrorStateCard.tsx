import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, ACCESSIBILITY, RADIUS } from '../../constants/tokens';

interface ErrorStateCardProps {
  /** Kısa açıklama — kullanıcıya ne olduğunu anlatır */
  message: string;
  /** Retry callback */
  onRetry: () => void;
  /** İsteğe bağlı stil */
  style?: ViewStyle;
  /** compact: daha küçük kart (ör. inline bloklar için) */
  variant?: 'default' | 'compact';
  /** Erişilebilirlik etiketi */
  accessibilityLabel?: string;
}

/**
 * Her fetch için tutarlı hata UI: kısa açıklama + retry CTA.
 * UI-UX-IMPROVEMENTS.md: "Hata durumları — Her fetch için retry CTA ve kısa açıklama"
 */
export function ErrorStateCard({
  message,
  onRetry,
  style,
  variant = 'default',
  accessibilityLabel,
}: ErrorStateCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const isCompact = variant === 'compact';
  const iconSize = isCompact ? 22 : 32;
  const s = createStyles(colors);

  return (
    <View style={[s.container, isCompact && s.containerCompact, style]}>
      <Ionicons
        name="cloud-offline-outline"
        size={iconSize}
        color={colors.error}
        style={s.icon}
      />
      <Text
        style={[s.message, isCompact && s.messageCompact]}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {message}
      </Text>
      <TouchableOpacity
        style={[s.retryBtn, isCompact && s.retryBtnCompact]}
        onPress={onRetry}
        accessibilityLabel={accessibilityLabel ?? t('common.retry')}
        accessibilityRole="button"
        accessibilityHint={t('accessibility.retryHint')}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh" size={isCompact ? 14 : 16} color={colors.white} />
        <Text
          style={[s.retryText, isCompact && s.retryTextCompact]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {t('common.retry')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: SPACING.lgXl,
      gap: SPACING.md,
      backgroundColor: C.card,
      borderRadius: SPACING.lg,
      borderWidth: 1,
      borderColor: C.border,
    },
    containerCompact: {
      padding: SPACING.mdLg,
      gap: SPACING.sm,
      borderRadius: SPACING.mdLg,
    },
    icon: { marginBottom: SPACING.xs },
    message: {
      ...TYPOGRAPHY.Small,
      color: C.subtext,
      textAlign: 'center',
    },
    messageCompact: { ...TYPOGRAPHY.Caption, lineHeight: 18 },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xsSm,
      backgroundColor: C.primary,
      paddingVertical: SPACING.smMd,
      paddingHorizontal: SPACING.lgXl,
      borderRadius: RADIUS.md,
      minHeight: 44,
      minWidth: 140,
    },
    retryBtnCompact: {
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      borderRadius: RADIUS.sm,
      minHeight: 44,
      minWidth: 120,
    },
    retryText: {
      ...TYPOGRAPHY.SmallBold,
      color: C.white,
    },
    retryTextCompact: { ...TYPOGRAPHY.SmallAlt },
  });
}
