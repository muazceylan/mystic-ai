import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../constants/tokens';
import type { IoniconName } from '../../constants/icons';

interface ChipProps {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  variant?: 'default' | 'primary' | 'success';
  size?: 'sm' | 'md';
  leftIcon?: IoniconName;
}

export function Chip({
  label,
  onPress,
  selected = false,
  variant = 'default',
  size = 'md',
  leftIcon,
}: ChipProps) {
  const { colors } = useTheme();
  const s = createStyles(colors);

  const bgColor = selected
    ? variant === 'primary'
      ? colors.primary
      : variant === 'success'
      ? colors.success
      : colors.primary
    : variant === 'primary'
    ? colors.primarySoftBg
    : variant === 'success'
    ? colors.successBg
    : colors.surface;

  const textColor = selected
    ? colors.white
    : variant === 'primary'
    ? colors.primary
    : variant === 'success'
    ? colors.success
    : colors.text;

  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        s.chip,
        size === 'sm' && s.chipSm,
        leftIcon != null && s.chipWithIcon,
        { backgroundColor: bgColor, borderColor: selected ? bgColor : colors.border },
        pressed && s.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      {leftIcon != null && (
        <Ionicons name={leftIcon} size={iconSize} color={textColor} />
      )}
      <Text
        style={[
          s.label,
          size === 'sm' && s.labelSm,
          { color: textColor },
        ]}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    chip: {
      borderRadius: RADIUS.full,
      borderWidth: 1,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 36,
    },
    chipSm: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      minHeight: 28,
    },
    chipWithIcon: {
      flexDirection: 'row',
      gap: 5,
    },
    pressed: {
      opacity: 0.7,
    },
    label: {
      ...TYPOGRAPHY.SmallBold,
    },
    labelSm: {
      ...TYPOGRAPHY.CaptionBold,
    },
  });
}
