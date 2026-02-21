import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, RADIUS } from '../../constants/tokens';

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
  return (
    <View style={[styles.badge, styles[`badge_${variant}`], style]}>
      <Text style={[styles.text, styles[`text_${variant}`], textStyle]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  badge_default: { backgroundColor: COLORS.border },
  badge_primary: { backgroundColor: COLORS.primarySoft },
  badge_success: { backgroundColor: COLORS.luckBg },
  badge_warning: { backgroundColor: COLORS.neutralBg },
  badge_error: { backgroundColor: COLORS.cautionBg },
  text: { fontSize: 12, fontWeight: '600' },
  text_default: { color: COLORS.textSecondary },
  text_primary: { color: COLORS.primary },
  text_success: { color: COLORS.success },
  text_warning: { color: COLORS.warning },
  text_error: { color: COLORS.error },
});
