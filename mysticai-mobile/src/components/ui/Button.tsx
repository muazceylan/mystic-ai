import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../constants/tokens';
import type { IoniconName } from '../../constants/icons';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  /** Screen reader için ek açıklama */
  accessibilityHint?: string;
  /** Optional icon rendered to the left of the button text */
  leftIcon?: IoniconName;
}

const ICON_SIZE_MAP: Record<'sm' | 'md' | 'lg', number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

export function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  leftIcon,
}: ButtonProps) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  const isDisabled = disabled || loading;

  // Resolve the text color for the current variant/disabled state
  let iconColor = colors.white;
  if (isDisabled) {
    iconColor = colors.disabledText;
  } else if (variant === 'outline') {
    iconColor = colors.text;
  } else if (variant === 'ghost') {
    iconColor = colors.primary;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        s.base,
        s[size],
        leftIcon && s.withIcon,
        variant === 'primary' && s.primary,
        variant === 'outline' && s.outline,
        variant === 'ghost' && s.ghost,
        isDisabled && s.disabled,
        style,
      ]}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.white : colors.primary}
        />
      ) : (
        <>
          {leftIcon ? (
            <Ionicons
              name={leftIcon}
              size={ICON_SIZE_MAP[size]}
              color={iconColor}
            />
          ) : null}
          <Text
            style={[
              s.text,
              s[`text_${size}`],
              variant === 'primary' && s.textPrimary,
              variant === 'outline' && s.textOutline,
              variant === 'ghost' && s.textGhost,
              isDisabled && s.textDisabled,
              textStyle,
            ]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    base: {
      minHeight: 44,
      minWidth: 44,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: RADIUS.lg,
      paddingHorizontal: SPACING.xl,
    },
    withIcon: {
      flexDirection: 'row',
      gap: SPACING.xsSm,
    },
    sm: { minHeight: 36, paddingHorizontal: SPACING.lg },
    md: {},
    lg: { minHeight: 52, paddingHorizontal: SPACING.xxl },
    primary: { backgroundColor: C.primary },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: C.border,
    },
    ghost: { backgroundColor: 'transparent' },
    disabled: { opacity: 0.5 },
    text: { fontWeight: '600' },
    text_sm: { fontSize: TYPOGRAPHY.Small.fontSize, lineHeight: TYPOGRAPHY.Small.lineHeight },
    text_md: { fontSize: TYPOGRAPHY.Body.fontSize, lineHeight: TYPOGRAPHY.Body.lineHeight },
    text_lg: { fontSize: TYPOGRAPHY.H3.fontSize, lineHeight: TYPOGRAPHY.H3.lineHeight },
    textPrimary: { color: C.white },
    textOutline: { color: C.text },
    textGhost: { color: C.primary },
    textDisabled: { color: C.disabledText },
  });
}
