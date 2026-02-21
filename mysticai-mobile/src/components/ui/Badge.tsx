import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { SPACING, RADIUS, ACCESSIBILITY } from '../../constants/tokens';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  label,
  variant = 'default',
  style,
  textStyle,
}: BadgeProps) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  return (
    <View style={[s.badge, s[`badge_${variant}`], style]}>
      <Text
        style={[s.text, s[`text_${variant}`], textStyle]}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {label}
      </Text>
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    badge: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.full,
      alignSelf: 'flex-start',
    },
    badge_default: { backgroundColor: C.border },
    badge_primary: { backgroundColor: C.primarySoft },
    badge_success: { backgroundColor: C.luckBg },
    badge_warning: { backgroundColor: C.neutralBg },
    badge_error: { backgroundColor: C.cautionBg },
    text: { fontSize: 12, fontWeight: '600' },
    text_default: { color: C.subtext },
    text_primary: { color: C.primary },
    text_success: { color: C.success },
    text_warning: { color: C.warning },
    text_error: { color: C.error },
  });
}
