import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing, typography } from '../../theme';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';

interface GreetingRowProps {
  text: string;
  contextText?: string;
}

const ICON_SIZE = spacing.md + spacing.xs - spacing.xxs;
const HOME_MAX_FONT_SCALE = 1.15;

export function GreetingRow({ text, contextText }: GreetingRowProps) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={styles.container}>
      <View style={styles.iconShell}>
        <Ionicons name="moon-outline" size={ICON_SIZE} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} numberOfLines={1} style={styles.text}>{text}</Text>
        {contextText ? (
          <Text maxFontSizeMultiplier={HOME_MAX_FONT_SCALE} numberOfLines={1} style={styles.contextText}>
            {contextText}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
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
      backgroundColor: isDark ? 'rgba(127,103,233,0.22)' : 'rgba(239,232,255,0.74)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      ...typography.Body,
      color: C.text,
      flexShrink: 1,
    },
    copy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xxs,
    },
    contextText: {
      ...typography.Caption,
      color: C.subtext,
    },
  });
}
