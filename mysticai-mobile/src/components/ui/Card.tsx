import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { SPACING, RADIUS, SHADOW } from '../../constants/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  variant?: 'default' | 'outlined' | 'elevated';
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function Card({
  children,
  style,
  padded = true,
  variant = 'default',
  onPress,
  accessibilityLabel,
}: CardProps) {
  const { colors } = useTheme();
  const s = createStyles(colors);

  const cardStyle = [
    s.card,
    variant === 'outlined' && s.outlined,
    variant === 'elevated' && s.elevated,
    padded && s.padded,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...cardStyle, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.card,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: C.border,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: C.border,
    },
    elevated: {
      borderWidth: 0,
      ...SHADOW.md,
    },
    padded: { padding: SPACING.lg },
    pressed: { opacity: 0.85 },
  });
}
