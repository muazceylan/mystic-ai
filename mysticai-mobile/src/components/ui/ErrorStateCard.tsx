import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

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
  accessibilityLabel = 'Tekrar dene',
}: ErrorStateCardProps) {
  const isCompact = variant === 'compact';
  const iconSize = isCompact ? 22 : 32;

  return (
    <View style={[styles.container, isCompact && styles.containerCompact, style]}>
      <Ionicons
        name="cloud-offline-outline"
        size={iconSize}
        color={COLORS.error}
        style={styles.icon}
      />
      <Text style={[styles.message, isCompact && styles.messageCompact]}>{message}</Text>
      <TouchableOpacity
        style={[styles.retryBtn, isCompact && styles.retryBtnCompact]}
        onPress={onRetry}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        activeOpacity={0.8}
      >
        <Ionicons name="refresh" size={isCompact ? 14 : 16} color={COLORS.white} />
        <Text style={[styles.retryText, isCompact && styles.retryTextCompact]}>
          Tekrar Dene
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  containerCompact: {
    padding: 14,
    gap: 8,
    borderRadius: 14,
  },
  icon: {
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: COLORS.subtext,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageCompact: {
    fontSize: 12,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 44,
    minWidth: 140,
  },
  retryBtnCompact: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    minHeight: 44,
    minWidth: 120,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  retryTextCompact: {
    fontSize: 13,
  },
});
