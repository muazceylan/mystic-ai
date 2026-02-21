import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/tokens';

const MIN_TOUCH = 44;

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  style?: ViewStyle;
  accessibilityLabel: string;
  hitSlop?: number;
}

export function IconButton({
  icon,
  onPress,
  size = 24,
  color = COLORS.text,
  style,
  accessibilityLabel,
  hitSlop = (MIN_TOUCH - size) / 2,
}: IconButtonProps) {
  const slop = Math.max(0, Math.ceil(hitSlop));
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.button, { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH }, style]}
      hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
