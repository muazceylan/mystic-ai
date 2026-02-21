import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { ACCESSIBILITY } from '../../constants/tokens';

const MIN_TOUCH = ACCESSIBILITY.minTouchTarget;

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  style?: ViewStyle;
  accessibilityLabel: string;
  /** Screen reader için ek açıklama */
  accessibilityHint?: string;
  disabled?: boolean;
  hitSlop?: number;
}

export function IconButton({
  icon,
  onPress,
  size = 24,
  color,
  style,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  hitSlop = (MIN_TOUCH - size) / 2,
}: IconButtonProps) {
  const { colors } = useTheme();
  const slop = Math.max(0, Math.ceil(hitSlop));
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH }, style]}
      hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      <Ionicons name={icon} size={size} color={color ?? colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
