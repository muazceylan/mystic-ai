import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { SPACING, RADIUS } from '../../constants/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function Card({ children, style, padded = true }: CardProps) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  return (
    <View style={[s.card, padded && s.padded, style]}>
      {children}
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.card,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: C.border,
    },
    padded: { padding: SPACING.lg },
  });
}
