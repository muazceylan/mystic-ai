import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

interface GreetingRowProps {
  text: string;
}

const ICON_SIZE = spacing.md + spacing.xs - spacing.xxs;
const HOME_MAX_FONT_SCALE = 1.15;

export function GreetingRow({ text }: GreetingRowProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconShell}>
        <Ionicons name="moon-outline" size={ICON_SIZE} color={colors.primary} />
      </View>
      <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} numberOfLines={1} style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconShell: {
    width: spacing.iconWrap - spacing.xs,
    height: spacing.iconWrap - spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.greetingIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.Body,
    color: colors.greetingText,
    flexShrink: 1,
  },
});
