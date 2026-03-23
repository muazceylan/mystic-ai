import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../../constants/tokens';
import { useGuruWalletStore } from '../store/useGuruWalletStore';

interface GuruBalanceBadgeProps {
  onPress?: () => void;
  size?: 'sm' | 'md';
}

export function GuruBalanceBadge({ onPress, size = 'md' }: GuruBalanceBadgeProps) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  const balance = useGuruWalletStore(state => state.getBalance());

  const content = (
    <View style={[s.container, size === 'sm' && s.containerSm]}>
      <Text
        style={[s.icon, size === 'sm' && s.iconSm]}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {'✦'}
      </Text>
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
        accessibilityLabel={`Guru bakiyesi: ${balance}`}
        accessibilityHint="Cüzdan ekranını açmak için dokunun"
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
      fontSize: 14,
      color: C.gold,
    },
    iconSm: {
      fontSize: 12,
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
