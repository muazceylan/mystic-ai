import React from 'react';
import { Image, Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../../constants/tokens';
import { useGuruWalletStore } from '../store/useGuruWalletStore';
import { useTranslation } from 'react-i18next';

const GURU_TOKEN_ICON = require('../../../../assets/guru-token-balance.png');

interface GuruBalanceBadgeProps {
  onPress?: () => void;
  size?: 'sm' | 'md';
}

export function GuruBalanceBadge({ onPress, size = 'md' }: GuruBalanceBadgeProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);
  const balance = useGuruWalletStore(state => state.getBalance());

  const content = (
    <View style={[s.container, size === 'sm' && s.containerSm]}>
      <Image
        source={GURU_TOKEN_ICON}
        style={[s.icon, size === 'sm' && s.iconSm]}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <Text
        style={[s.balance, size === 'sm' && s.balanceSm]}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {balance}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => pressed ? { opacity: 0.8 } : undefined}
        accessibilityRole="button"
        accessibilityLabel={t('monetization.guruBalanceA11y', { balance: String(balance) })}
        accessibilityHint={t('monetization.guruBalanceHint')}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.primary,
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      gap: SPACING.xs,
    },
    containerSm: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 2,
    },
    icon: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    iconSm: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    balance: {
      ...TYPOGRAPHY.SmallBold,
      color: C.white,
    },
    balanceSm: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.white,
    },
  });
}
