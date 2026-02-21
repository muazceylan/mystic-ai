import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../constants/tokens';

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
}

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
}: ButtonProps) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        s.base,
        s[size],
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
