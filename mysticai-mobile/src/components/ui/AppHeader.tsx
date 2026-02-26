import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, ACCESSIBILITY } from '../../constants/tokens';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  transparent?: boolean;
  tintColor?: string;
}

export function AppHeader({
  title,
  subtitle,
  onBack,
  rightActions,
  transparent = false,
  tintColor,
}: AppHeaderProps) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  const textColor = tintColor ?? colors.text;
  const subColor = tintColor ? tintColor + 'AA' : colors.subtext;

  return (
    <View style={[s.container, transparent && s.transparent]}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={s.backBtn}
          hitSlop={12}
          accessibilityLabel="Geri"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </Pressable>
      ) : (
        <View style={s.spacer} />
      )}

      <View style={s.center}>
        <Text
          style={[s.title, { color: textColor }]}
          numberOfLines={1}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[s.subtitle, { color: subColor }]}
            numberOfLines={1}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightActions ? (
        <View style={s.right}>{rightActions}</View>
      ) : (
        <View style={s.spacer} />
      )}
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      backgroundColor: C.bg,
    },
    transparent: {
      backgroundColor: 'transparent',
    },
    backBtn: {
      width: 40,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    center: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    title: {
      ...TYPOGRAPHY.H3,
      textAlign: 'center',
    },
    subtitle: {
      ...TYPOGRAPHY.Caption,
      textAlign: 'center',
    },
    right: {
      width: 40,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    spacer: {
      width: 40,
    },
  });
}
